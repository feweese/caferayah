import { NextResponse } from 'next/server';
import { io } from '../route';

// This endpoint is used as the Socket.IO handler path
export async function GET(req) {
  return NextResponse.json({ status: 'ok', message: 'Socket.IO endpoint is active' });
}

// Handle all methods
export async function POST(req) {
  return NextResponse.json({ status: 'ok' });
}

export const dynamic = 'force-dynamic'; 