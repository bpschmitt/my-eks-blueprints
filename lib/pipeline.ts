import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';

export default class PipelineConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps){
    super(scope,id)

    const blueprint = blueprints.EksBlueprint.builder()
    .account(props?.env?.account)
    .region(props?.env?.region)
    .addOns()
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
          { id: "dev", stackBuilder: blueprint.clone('us-east-1')},
          { id: "prod", stackBuilder: blueprint.clone('us-west-2')}
        ]
      })
      .build(scope, id+'-stack', props);
  }
}