import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { NewRelicAddOn } from '@newrelic/newrelic-eks-blueprints-addon';
import { TeamApplication, TeamPlatform } from '../teams';

export default class PipelineConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps){
    super(scope,id)

    // Set the parent AWS account and region
    const account = props?.env?.account!;
    const region = props?.env?.region!;

    // Define some addons that will apply to all clusters
    const commonaddOns: Array<blueprints.ClusterAddOn> = [
      new blueprints.SecretsStoreAddOn,
      new blueprints.ClusterAutoScalerAddOn
    ];

    // Customize the dev Cluster using a GenericClusterProvider
    // In this example, SPOT instances are used to reduce cost
    const devClusterProvider = new blueprints.GenericClusterProvider({
      version: cdk.aws_eks.KubernetesVersion.V1_21,
      managedNodeGroups: [
        {
          id: "mng-spot",
          amiType: cdk.aws_eks.NodegroupAmiType.AL2_X86_64,
          instanceTypes: [new cdk.aws_ec2.InstanceType('m5.large')],
          nodeGroupCapacityType: cdk.aws_eks.CapacityType.SPOT
        }
      ]
    })

    // Customize the prod Cluster using a GenericClusterProvider
    // In this example, resiliency and performance are key so
    // ONDEMOND Bottle Rocket instances are used.
    const prodClusterProvider = new blueprints.GenericClusterProvider({
      version: cdk.aws_eks.KubernetesVersion.V1_21,
      managedNodeGroups: [
        {
          id: "mng-ondemand",
          amiType: cdk.aws_eks.NodegroupAmiType.BOTTLEROCKET_X86_64,
          instanceTypes: [new cdk.aws_ec2.InstanceType('m5.xlarge')]
        }
      ]
    })

    // Define the base blueprint
    const blueprint = blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .addOns(...commonaddOns)
    .teams(new TeamPlatform(account), new TeamApplication('schmitt', account));

    const repoUrl = 'https://github.com/bpschmitt/eks-blueprints-workloads.git';

    const bootstrapRepo : blueprints.ApplicationRepository = {
      repoUrl,
      targetRevision: 'nerdtalk'
    }

    const devBootstrapArgo = new blueprints.ArgoCDAddOn({
      bootstrapRepo: {
        ...bootstrapRepo,
        path: 'envs/dev'
      },
    });

    const prodBootstrapArgo = new blueprints.ArgoCDAddOn({
      bootstrapRepo: {
        ...bootstrapRepo,
        path: 'envs/prod'
      },
    });

    blueprints.CodePipelineStack.builder()
      .name("eks-blueprints-workshop-pipeline")
      .owner("bpschmitt")
      .repository({
          repoUrl: 'my-eks-blueprints',
          credentialsSecretName: 'github-token',
          targetRevision: 'main'
      })
      .wave({
        id: "envs",
        stages: [
          { id: "dev", stackBuilder: blueprint.clone('us-east-1')
          .addOns(new NewRelicAddOn({
            version: "4.3.1-beta",
            newRelicClusterName: "eks-blueprints-workshop-dev",
            awsSecretName: "newrelic-pixie-combined",
            installPixie: true,
            installPixieIntegration: true
          }))
        .addOns(devBootstrapArgo)
        .clusterProvider(devClusterProvider)},
          { id: "prod", stackBuilder: blueprint.clone('us-west-2')
          .addOns(new NewRelicAddOn({
            newRelicClusterName: "eks-blueprints-workshop-prod",
            awsSecretName: "newrelic-pixie-combined"
          }))
        .addOns(prodBootstrapArgo)
        .clusterProvider(prodClusterProvider)}
        ]
      })
      .build(scope, id+'-stack', props);
  }
}