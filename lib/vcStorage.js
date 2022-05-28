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
      keyResolver
    };
    const edvClient = new EdvClient(edvParameters);
    edvClient.ensureIndex({attribute: 'content.type', unique: false});

    const edvDoc = new EdvDocument({
      ...edvParameters,
      client: edvClient
    });

    // content for the doc
    const content = {
      type: 'message',
      from: {
        id: window.location.origin,
        name: siteName
      },
      payload
    };

    // common case is EDV doc does not exist, so attempt to write it without
    // reading it first
    try {
      await edvDoc.write({doc: {id: edvDoc.id, content, meta: {}}});
      return {success: true, redirectUrl};
    } catch(e) {
      if(e.name !== 'InvalidStateError') {
        // unhandleable error
        throw e;
      }
    }

    // read and overwite existing doc
    let doc;
    try {
      doc = await edvDoc.read();
    } catch(e) {
      if(e.name !== 'NotFoundError') {
        // unhandleable error
        throw e;
      }
      doc = {id: edvDoc.id};
    }
    await edvDoc.write({doc: {...doc, content}});
    return {success: true, redirectUrl};
  } catch(e) {
    console.error(e);
    return {success: false, redirectUrl: null};
  }
}

async function keyResolver({id}) {
  const {data} = await httpClient.get(id);
  return data;
}

async function _createCapabilityAgent({handle}) {
  // generate a secret and load a new capability agent
  const secret = new Uint8Array(32);
  crypto.getRandomValues(secret);
  return CapabilityAgent.fromSecret({secret, handle});
}
