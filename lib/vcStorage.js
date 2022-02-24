/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */

import {httpClient} from '@digitalbazaar/http-client';
import {
  CapabilityAgent, KeyAgreementKey, Hmac
} from '@digitalbazaar/webkms-client';
import {EdvClient, EdvDocument} from '@digitalbazaar/edv-client';

export async function storeVcsViaZcap({
  transactionId, siteName, stepId, payload
}) {
  try {
    // eslint-disable-next-line no-unused-vars
    const [exchangeInstanceId, _] = transactionId.split('-');
    const capabilityAgent = await _createCapabilityAgent({handle: 'primary'});

    const exchangeInstanceInitialStepUrl =
      `/exchange-instances/${exchangeInstanceId}/${stepId}`;
    const exchangeInstanceDelegateZcapUrl =
      `${exchangeInstanceInitialStepUrl}/delegate` +
      `?controller=${encodeURIComponent(capabilityAgent.id)}`;

    const [
      {data: {redirectUrl}},
      {data: zcaps},
    ] = await Promise.all([
      httpClient.get(exchangeInstanceInitialStepUrl),
      httpClient.get(exchangeInstanceDelegateZcapUrl),
    ]);

    const invocationSigner = capabilityAgent.signer;

    const [
      keyAgreementKey,
      hmac,
    ] = await Promise.all([
      KeyAgreementKey.fromCapability({
        capability: zcaps['inbox-edv-keyAgreementKey'],
        invocationSigner
      }),
      Hmac.fromCapability({
        capability: zcaps['inbox-edv-hmac'],
        invocationSigner
      }),
    ]);
    const edvParameters = {
      invocationSigner,
      keyAgreementKey,
      hmac,
      capability: zcaps['inbox-edv-document'],
    };
    const edvClient = new EdvClient(edvParameters);
    edvClient.ensureIndex({attribute: 'content.type', unique: false});

    const doc = new EdvDocument({
      ...edvParameters,
      client: edvClient,
      keyResolver: async ({id}) => {
        const {data} = await httpClient.get(id);
        return data;
      }
    });

    const edvDoc = await doc.read();
    const writeContent = {
      type: 'message',
      from: {
        id: window.location.origin,
        name: siteName
      },
      payload
    };
    await doc.write({doc: {...edvDoc, content: writeContent}});
    const {content} = await doc.read();

    const success = _writeSuccesful({
      expected: payload, actual: content.payload
    });
    return {
      success,
      redirectUrl
    };
  } catch(e) {
    console.error(e);
    return {
      success: false,
      redirectUrl: null
    };
  }
}

function _writeSuccesful({expected, actual}) {
  try {
    const vcsExpected = expected.data.verifiableCredential;
    const vcsActual = actual.data.verifiableCredential;
    if(vcsExpected.length === vcsActual.length) {
      console.log('write successful');
      return true;
    } else {
      console.log('Write unsuccessful.', {expected, actual});
      return false;
    }
  } catch(e) {
    console.error(e);
    return false;
  }
}

async function _createCapabilityAgent({handle}) {
  // generate a secret and load a new capability agent
  const secret = new Uint8Array(32);
  crypto.getRandomValues(secret);
  return CapabilityAgent.fromSecret({secret, handle});
}
