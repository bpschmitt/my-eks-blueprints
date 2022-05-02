import * as cdk from 'aws-cdk-lib';
import ClusterConstruct from '../lib/my-eks-blueprints-stack';
import PipelineConstruct from '../lib/pipeline';

const app = new cdk.App();
const account = process.env.CDK_DEFAULT_ACCOUNT!;
const region = process.env.CDK_DEFAULT_REGION;
const env = { account, region }

new ClusterConstruct(app, 'my-eks-blueprints', { env });
new PipelineConstruct(app, 'workshop-pipeline', { env });