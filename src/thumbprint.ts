/* istanbul ignore file */
// the X509 certificate API is available only in node16.
// since we compile the repo against node 14, typechecking it will fail.
// its currently too complex to configure node16 only on this
// file (jsii doesn't support custom tsconfig)
// so we disable typechecking. don't worry, we have sufficient integ tests that
// validate this code doesn't break.
// @ts-nocheck
import { X509Certificate } from 'node:crypto';
import * as tls from 'tls';
import * as url from 'url';

// allows unit test to replace with mocks
export function defaultLogger(fmt: string, ...args: any[]) {
  // eslint-disable-next-line no-console
  console.log(fmt, ...args);
}

/**
 * Downloads the CA thumbprint from the issuer URL
 */
export async function downloadThumbprint(issuerUrl: string) {

  return new Promise<string>((ok, ko) => {
    const purl = url.parse(issuerUrl);
    const port = purl.port ? parseInt(purl.port, 10) : 443;

    if (!purl.host) {
      return ko(new Error(`unable to determine host from issuer url ${issuerUrl}`));
    }

    defaultLogger(`Fetching x509 certificate chain from issuer ${issuerUrl}`);

    const socket = tls.connect(port, purl.host, { rejectUnauthorized: false, servername: purl.host });
    socket.once('error', ko);

    socket.once('secureConnect', () => {
      let cert = socket.getPeerX509Certificate();
      if (!cert) {
        throw new Error(`Unable to retrieve X509 certificate from host ${purl.host}`);
      }
      while (cert.issuerCertificate) {
        printCertificate(cert);
        cert = cert.issuerCertificate;
      }
      const validTo = new Date(cert.validTo);
      const certificateValidity = getCertificateValidity(validTo);

      if (certificateValidity < 0) {
        return ko(new Error(`The certificate has already expired on: ${validTo.toUTCString()}`));
      }

      // Warning user if certificate validity is expiring within 6 months
      if (certificateValidity < 180) {
        /* eslint-disable-next-line no-console */
        console.warn(`The root certificate obtained would expire in ${certificateValidity} days!`);
      }

      socket.end();

      const thumbprint = extractThumbprint(cert);
      defaultLogger(`Certificate Authority thumbprint for ${issuerUrl} is ${thumbprint}`);

      ok(thumbprint);
    });
  });
}

function extractThumbprint(cert: X509Certificate) {
  return cert.fingerprint.split(':').join('');
}

function printCertificate(cert: X509Certificate) {
  defaultLogger('-------------BEGIN CERT----------------');
  defaultLogger(`Thumbprint: ${extractThumbprint(cert)}`);
  defaultLogger(`Valid To: ${cert.validTo}`);
  if (cert.issuerCertificate) {
    defaultLogger(`Issuer Thumbprint: ${extractThumbprint(cert.issuerCertificate)}`);
  }
  defaultLogger(`Issuer: ${cert.issuer}`);
  defaultLogger(`Subject: ${cert.subject}`);
  defaultLogger('-------------END CERT------------------');
}

/**
 * To get the validity timeline for the certificate
 * @param certDate The valid to date for the certificate
 * @returns The number of days the certificate is valid wrt current date
 */
function getCertificateValidity(certDate: Date): Number {
  const millisecondsInDay = 24 * 60 * 60 * 1000;
  const currentDate = new Date();

  const validity = Math.round((certDate.getTime() - currentDate.getTime()) / millisecondsInDay);

  return validity;
}
