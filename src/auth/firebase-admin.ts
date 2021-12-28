import * as firebase from 'firebase-admin';
import { firebaseAccount, firebaseDB, firebaseDomain } from '../.config';

const firebase_params = {
    type: firebaseAccount.type,
    projectId: firebaseAccount.project_id,
    privateKeyId: firebaseAccount.private_key_id,
    privateKey: firebaseAccount.private_key,
    clientEmail: firebaseAccount.client_email,
    clientId: firebaseAccount.client_id,
    authUri: firebaseAccount.auth_uri,
    tokenUri: firebaseAccount.token_uri,
    authProviderX509CertUrl: firebaseAccount.auth_provider_x509_cert_url,
    clientC509CertUrl: firebaseAccount.client_x509_cert_url
}

const defaultApp = firebase.initializeApp({
    credential: firebase.credential.cert(firebase_params),
    databaseURL: `https://${firebaseDB}.${firebaseDomain}`
});

export {
    defaultApp
}