import * as thumbprint from './thumbprint';

export async function handler(event: AWSLambda.CloudFormationCustomResourceEvent) {
  if (event.RequestType === 'Create') { return onCreate(event); }
  if (event.RequestType === 'Update') { return onUpdate(event); }
  if (event.RequestType === 'Delete') { return; }
  throw new Error('invalid request type');
}

async function onCreate(event: AWSLambda.CloudFormationCustomResourceCreateEvent) {
  const issuerUrl = event.ResourceProperties.Url;
  const thumbprints: string[] = [];

  thumbprints.push(await thumbprint.downloadThumbprint(issuerUrl));

  return {
    PhysicalResourceId: 'TestPhysicalResourceId',
    Data: {
      Thumbprints: JSON.stringify(thumbprints),
    },
  };
}

async function onUpdate(event: AWSLambda.CloudFormationCustomResourceUpdateEvent) {
  const issuerUrl = event.ResourceProperties.Url;
  const thumbprints: string[] = (event.ResourceProperties.ThumbprintList ?? []).sort(); // keep sorted for UPDATE

  // determine which update we are talking about.
  const oldIssuerUrl = event.OldResourceProperties.Url;

  // if this is a URL update, then we basically create a new resource and cfn will delete the old one
  // since the physical resource ID will change.
  if (oldIssuerUrl !== issuerUrl) {
    return onCreate({ ...event, RequestType: 'Create' });
  }

  const providerArn = event.PhysicalResourceId;

  if (thumbprints.length === 0) {
    thumbprints.push(await thumbprint.downloadThumbprint(issuerUrl));
  }

  return {
    Data: {
      Thumbprints: JSON.stringify(thumbprints),
    },
  };
}
