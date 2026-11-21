import { json, fail } from '@/lib/brain/route';
import { getCertificateByCode } from '@/lib/data';

/** Public: anyone with the code can verify a certificate. */
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  try {
    const certificate = await getCertificateByCode(decodeURIComponent(params.code).toUpperCase());
    return certificate ? json({ certificate }) : json({ error: 'No certificate with this ID' }, 404);
  } catch (err) {
    return fail(err);
  }
}
