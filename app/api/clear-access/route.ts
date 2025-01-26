// app/api/clear-access/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
 cookies().delete('rhun_early_access_token');
 cookies().delete('crossmint_order_id');
 return NextResponse.json({ success: true });
}