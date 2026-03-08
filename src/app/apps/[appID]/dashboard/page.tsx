import { redirect } from 'next/navigation';

type Props = { params: Promise<{ appID: string }> };

/** 旧パス /apps/[appID]/dashboard を /apps/[appID]/settings へリダイレクト */
export default async function AppDashboardRedirectPage({ params }: Props) {
  const { appID } = await params;
  redirect(`/apps/${appID}/settings`);
}
