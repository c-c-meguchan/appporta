import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const IMAGE_BUCKET = 'app-images';
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const appId = formData.get('app_id') as string | null;
    const userName = formData.get('user_name') as string | null;
    const content = formData.get('content') as string | null;
    const secretMessage = (formData.get('secret_message') as string | null) || null;
    const iconFile = formData.get('user_icon') as File | null;

    if (!appId || !userName?.trim()) {
      return NextResponse.json({ error: 'app_id と user_name は必須です' }, { status: 400 });
    }

    let userIconUrl: string | null = null;

    if (iconFile && iconFile.size > 0) {
      if (iconFile.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: '画像は2MB以下にしてください' }, { status: 400 });
      }

      const ext = iconFile.name.split('.').pop() || 'png';
      const filePath = `testimonials/${appId}/${crypto.randomUUID()}.${ext}`;
      const buffer = Buffer.from(await iconFile.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(filePath, buffer, { contentType: iconFile.type });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        return NextResponse.json({ error: '画像のアップロードに失敗しました' }, { status: 500 });
      }

      const { data: urlData } = supabase.storage
        .from(IMAGE_BUCKET)
        .getPublicUrl(filePath);
      userIconUrl = urlData.publicUrl;
    }

    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert({
        app_id: appId,
        user_name: userName.trim(),
        content: (content ?? '').trim(),
        secret_message: secretMessage?.trim() || null,
        user_icon_url: userIconUrl,
      })
      .select('id, user_icon_url, user_name, content, created_at')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: '投稿に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ review });
  } catch (err) {
    console.error('Testimonial API error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
