import * as path from 'path';
import { Construct } from 'constructs';
import {
  CustomResource,
  CustomResourceProvider,
  CustomResourceProviderRuntime,
  Token,
} from 'aws-cdk-lib/core';

const RESOURCE_TYPE = 'Custom::Thumbprint';

export class Thumbprint extends Construct {
  public readonly thumbprints: string;

  constructor(scope: Construct, id: string, props: { url: string }) {
    super(scope, id);
    
    const provider = this.getOrCreateProvider();
    const resource = new CustomResource(this, 'Resource', {
      resourceType: RESOURCE_TYPE,
      serviceToken: provider.serviceToken,
      properties: {
        Url: props.url,
        CodeHash: provider.codeHash,
      },
    });

    this.thumbprints = Token.asString(resource.getAtt('Thumbprints'));
  }

  private getOrCreateProvider() {
    return CustomResourceProvider.getOrCreateProvider(this, RESOURCE_TYPE, {
      codeDirectory: path.join(__dirname, '../', 'src'),
      runtime: CustomResourceProviderRuntime.NODEJS_16_X,
      policyStatements: [],
    });
  }
}