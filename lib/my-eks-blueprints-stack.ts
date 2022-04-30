import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { NewRelicAddOn } from '@newrelic/newrelic-eks-blueprints-addon';

export default class ClusterConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);

    const blueprint = blueprints.EksBlueprint.builder()
    .account(props?.env?.account)
    .region(props?.env?.region)
    .addOns(new blueprints.addons.SecretsStoreAddOn)
    .addOns(new NewRelicAddOn({
      newRelicClusterName: "my-eks-blueprints-workshop",
      awsSecretName: "my-eks-blueprints-workshop"
    }))
    .teams()
    .build(scope, id+"-stack");
  }
}