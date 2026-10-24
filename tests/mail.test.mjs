import {test} from 'node:test';
import assert from 'node:assert/strict';
import {operatorMail} from '../src/mail.server.mjs';

test('operator mail submits to the configured managed relay and suppresses development delivery', async () => {
 const original = globalThis.fetch;
 const requests = [];
 globalThis.fetch = async (url, init) => {
  requests.push({url, init});
  return new Response(JSON.stringify({messageId:'synthetic-pane-1',id:'synthetic-pane-1'}), {status: url.includes('resend.com') ? 200 : 202});
 };
 const message = {deliveryId:'synthetic-pane-2', from:'sender@example.test', to:['recipient@example.test'], subject:'Pane enquiry', text:'A synthetic enquiry', headers:{}};
 try {
  const env = {MAIL_PROVIDER:'rer', MAIL_API_KEY:'synthetic-pane-3', MAIL_RELAY_URL:'https://relay.example.test/send'};
  const result = await operatorMail(env).send(message);
  assert.equal(result.status, 'accepted');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, env.MAIL_RELAY_URL);
  assert.equal(requests[0].init.headers.Authorization, 'Bearer synthetic-pane-3');
  assert.equal(JSON.parse(requests[0].init.body).to, 'recipient@example.test');
  assert.equal(Object.hasOwn(JSON.parse(requests[0].init.body), 'from'), false);
  for (const local of [{AUTH_LOCAL:'true'}, {RER_DEMO:'1'}]) {
   assert.equal((await operatorMail({...env,...local}).send(message)).status, 'development');
  }
  assert.equal(requests.length, 1);
  await assert.rejects(operatorMail({...env,MAIL_RELAY_URL:''}).send(message), {code:'rer_relay_url_required'});
  assert.equal(requests.length, 1);
  const direct = await operatorMail({...env,MAIL_PROVIDER:'resend'}).send(message);
  assert.equal(direct.status, 'accepted');
  assert.equal(requests[1].url, 'https://api.resend.com/emails');
 } finally {globalThis.fetch = original;}
});
