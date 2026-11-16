/**
 * Render Markdown isi Announcement (sintaks toolbar Portal):
 * # / ## / ### judul · **tebal** · *miring* / _miring_ · ~~coret~~
 * - daftar · 1. daftar bernomor · > kutipan · [teks](https://url)
 */
import { Fragment, type ReactNode } from 'react';
import { Linking, Text, View } from 'react-native';

type Block =
  | { type: 'h1' | 'h2' | 'h3' | 'p' | 'quote'; text: string }
  | { type: 'ul' | 'ol'; items: string[] };

function parse(md: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;
  const flush = () => {
    if (para.length) out.push({ type: 'p', text: para.join('\n') });
    para = [];
  };
  const endList = () => {
    if (list) out.push(list);
    list = null;
  };
  for (const raw of md.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    let m: RegExpExecArray | null;
    if (!line.trim()) {
      flush();
      endList();
    } else if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) {
      flush();
      endList();
      out.push({ type: (['h1', 'h2', 'h3'] as const)[m[1]!.length - 1]!, text: m[2]! });
    } else if ((m = /^\s*[-*]\s+(.*)$/.exec(line)) || (m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) {
      flush();
      const kind = /^\s*\d/.test(line) ? 'ol' : 'ul';
      if (!list || list.type !== kind) {
        endList();
        list = { type: kind, items: [] };
      }
      list.items.push(m[1]!);
    } else if ((m = /^>\s?(.*)$/.exec(line))) {
      flush();
      endList();
      out.push({ type: 'quote', text: m[1]! });
    } else {
      endList();
      para.push(line);
    }
  }
  flush();
  endList();
  return out;
}

// Tanpa lookbehind (aman untuk semua engine JS).
const TOKEN = /(\*\*[^*]+\*\*|~~[^~]+~~|\[[^\]]+\]\([^)\s]+\)|\*[^*\n]+\*|\b_[^_\n]+_\b)/g;

function inline(text: string, keyBase: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN)) {
    const tok = m[0];
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith('**')) parts.push(<Text key={k} className="font-bold">{inline(tok.slice(2, -2), k)}</Text>);
    else if (tok.startsWith('~~')) parts.push(<Text key={k} style={{ textDecorationLine: 'line-through' }}>{tok.slice(2, -2)}</Text>);
    else if (tok.startsWith('[')) {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)!;
      const url = lm[2]!;
      const ok = /^(https?:\/\/|mailto:)/i.test(url);
      parts.push(
        <Text key={k} className={ok ? 'text-brand-600 underline' : ''} onPress={ok ? () => Linking.openURL(url).catch(() => {}) : undefined}>
          {lm[1]}
        </Text>,
      );
    } else parts.push(<Text key={k} className="italic">{tok.slice(1, -1)}</Text>);
    last = at + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function AnnouncementMarkdown({ source, compact = false }: { source: string; compact?: boolean }) {
  const base = compact ? 'text-[14px] leading-[22px]' : 'text-[15px] leading-6';
  return (
    <View className="gap-2.5">
      {parse(source).map((b, idx) => {
        const k = `b${idx}`;
        if (b.type === 'h1') return <Text key={k} className="text-lg font-bold text-neutral-900 mt-1">{inline(b.text, k)}</Text>;
        if (b.type === 'h2') return <Text key={k} className="text-base font-bold text-neutral-900 mt-1">{inline(b.text, k)}</Text>;
        if (b.type === 'h3') return <Text key={k} className="text-[15px] font-bold text-neutral-900">{inline(b.text, k)}</Text>;
        if (b.type === 'quote')
          return (
            <View key={k} className="border-l-[3px] border-brand-300 bg-brand-50 rounded-r-lg px-3 py-2">
              <Text className={`${base} text-brand-900`}>{inline(b.text, k)}</Text>
            </View>
          );
        if (b.type === 'ul' || b.type === 'ol')
          return (
            <View key={k} className="gap-1">
              {b.items.map((it, j) => (
                <View key={`${k}-${j}`} className="flex-row gap-2">
                  <Text className={`${base} text-neutral-700`}>{b.type === 'ul' ? '•' : `${j + 1}.`}</Text>
                  <Text className={`${base} text-neutral-800 flex-1`}>{inline(it, `${k}-${j}`)}</Text>
                </View>
              ))}
            </View>
          );
        return (
          <Text key={k} className={`${base} text-neutral-800`}>
            {(b as { text: string }).text.split("\n").map((ln: string, j: number, arr: string[]) => (
              <Fragment key={`${k}-l${j}`}>
                {inline(ln, `${k}-l${j}`)}
                {j < arr.length - 1 ? '\n' : ''}
              </Fragment>
            ))}
          </Text>
        );
      })}
    </View>
  );
}
