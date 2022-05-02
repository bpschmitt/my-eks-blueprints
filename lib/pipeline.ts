import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { NewRelicAddOn } from '@newrelic/newrelic-eks-blueprints-addon';
import { TeamApplication, TeamPlatform } from '../teams';

export default class PipelineConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps){
    super(scope,id)

    const account = props?.env?.account!;
    const region = props?.env?.region!;

    const commonaddOns: Array<blueprints.ClusterAddOn> = [
      new blueprints.SecretsStoreAddOn,
      new blueprints.ClusterAutoScalerAddOn,
      new blueprints.ArgoCDAddOn
    ];

    const blueprint = blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .addOns(...commonaddOns)
    .teams(new TeamPlatform(account), new TeamApplication('schmitt', account));

    const repoUrl = 'https://github.com/aws-samples/eks-blueprints-workloads.git';

    const bootstrapRepo : blueprints.ApplicationRepository = {
      repoUrl,
      targetRevision: 'workshop'
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
            newRelicClusterName: "eks-blueprints-workshop-dev",
            awsSecretName: "my-eks-blueprints-workshop"
          }))
        .addOns(devBootstrapArgo)},
          { id: "prod", stackBuilder: blueprint.clone('us-west-2')
          .addOns(new NewRelicAddOn({
            newRelicClusterName: "eks-blueprints-workshop-prod",
            awsSecretName: "my-eks-blueprints-workshop"
          }))
        .addOns(prodBootstrapArgo)}
        ]
      })
      .build(scope, id+'-stack', props);
  }
}