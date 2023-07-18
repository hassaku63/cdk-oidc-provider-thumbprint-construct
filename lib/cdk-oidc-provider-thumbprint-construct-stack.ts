import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Thumbprint } from "./thumbprint";

export class CdkOidcProviderThumbprintConstructStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const resource = new Thumbprint(this, 'Thumbprint', {
      url: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_123456789',
    });

    new cdk.CfnOutput(this, 'Thumbprints', {
      value: resource.thumbprints,
    });
  }
}
