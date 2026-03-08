import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { isStudioHost, getStudioOrigin } from '@/lib/constants';
import LPPage from '@/components/LPPage';

export default async function RootPage() {
  const headersList = await headers();
  const host = headersList.get('host');
  if (isStudioHost(host)) {
    redirect('/apps');
  }
  const request = { headers: { get: (name: string) => headersList.get(name) } };
  const studioOrigin = getStudioOrigin(request);
  const studioLoginUrl = `${studioOrigin}/login`;
  return <LPPage studioLoginUrl={studioLoginUrl} studioOrigin={studioOrigin} />;
}
