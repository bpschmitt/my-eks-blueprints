import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { NewRelicAddOn } from '@newrelic/newrelic-eks-blueprints-addon';

export default class PipelineConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps){
    super(scope,id)

    const blueprintDev = blueprints.EksBlueprint.builder()
    .account(props?.env?.account)
    .region(props?.env?.region)
    .addOns(new blueprints.SecretsStoreAddOn)
    .addOns(new NewRelicAddOn({
      newRelicClusterName: "my-eks-blueprints-workshop-dev",
      awsSecretName: "my-eks-blueprints-workshop"
    }))
    .teams();

    const blueprintProd = blueprints.EksBlueprint.builder()
    .account(props?.env?.account)
    .region(props?.env?.region)
    .addOns(new blueprints.SecretsStoreAddOn)
    .addOns(new NewRelicAddOn({
      newRelicClusterName: "my-eks-blueprints-workshop-prod",
      awsSecretName: "my-eks-blueprints-workshop"
    }))
    .teams();

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
          { id: "dev", stackBuilder: blueprintDev.clone('us-east-1')},
          { id: "prod", stackBuilder: blueprintProd.clone('us-west-2')}
        ]
      })
      .build(scope, id+'-stack', props);
  }
}