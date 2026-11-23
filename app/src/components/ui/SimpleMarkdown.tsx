import { Text, View } from 'react-native';

import { inline as mdInline } from '@/components/announcement/AnnouncementMarkdown';

type Props = {
  source: string;
};

/**
 * Minimal markdown renderer untuk renungan/news content.
 * Support: H1-H3 headings, paragraphs, bold (**), italic (*), bullets (-),
 * blockquotes (>), Bible verse style (italic indented).
 * 2.5.1: + daftar bernomor (1.), ~~coret~~, [link](https://…) — sama dengan
 * toolbar editor Portal. App 2.5.0 belum mengenal ketiganya (Portal membatasi toolbar).
 *
 * Untuk kebutuhan lebih advanced (tables, code, links, images) ganti dengan
 * react-native-markdown-display dependency. Saat ini cukup untuk MVP konten
 * renungan + news sederhana.
 */
export function SimpleMarkdown({ source }: Props) {
  const blocks = parseBlocks(source);
  return (
    <View className="gap-3">
      {blocks.map((block, i) => renderBlock(block, i))}
    </View>
  );
}

type Block =
  | { type: 'h1' | 'h2' | 'h3' | 'p'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'quote'; text: string };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let currentList: string[] | null = null;
  let currentOrdered = false;
  let currentParagraph: string[] = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      blocks.push({ type: 'p', text: currentParagraph.join(' ').trim() });
      currentParagraph = [];
    }
  }
  function flushList() {
    if (currentList && currentList.length > 0) {
      blocks.push({ type: 'list', items: currentList, ordered: currentOrdered });
      currentList = null;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '') {
      flushParagraph();
      flushList();
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h3', text: line.slice(4) });
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h2', text: line.slice(3) });
      continue;
    }
    if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h1', text: line.slice(2) });
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'quote', text: line.slice(2) });
      continue;
    }

    // List item (bullet / bernomor)
    const ol = /^\d+[.)]\s+(.*)$/.exec(line);
    if (line.startsWith('- ') || line.startsWith('* ') || ol) {
      flushParagraph();
      const ordered = !!ol;
      if (currentList && currentOrdered !== ordered) flushList();
      if (!currentList) currentList = [];
      currentOrdered = ordered;
      currentList.push(ol ? ol[1]! : line.slice(2));
      continue;
    }

    // Paragraph line
    flushList();
    currentParagraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function renderBlock(block: Block, key: number) {
  switch (block.type) {
    case 'h1':
      return (
        <Text key={key} className="text-2xl font-bold text-neutral-900 mt-2">
          {renderInline(block.text)}
        </Text>
      );
    case 'h2':
      return (
        <Text key={key} className="text-xl font-bold text-neutral-900 mt-2">
          {renderInline(block.text)}
        </Text>
      );
    case 'h3':
      return (
        <Text key={key} className="text-lg font-bold text-neutral-900 mt-1">
          {renderInline(block.text)}
        </Text>
      );
    case 'quote':
      return (
        <View
          key={key}
          className="border-l-4 border-brand-400 bg-brand-50 pl-3 py-2 pr-3 rounded-r-lg"
        >
          <Text className="text-base text-neutral-700 italic leading-relaxed">
            {renderInline(block.text)}
          </Text>
        </View>
      );
    case 'list':
      return (
        <View key={key} className="gap-1.5 pl-1">
          {block.items.map((item, i) => (
            <View key={i} className="flex-row gap-2">
              <Text className="text-base text-neutral-700">{block.ordered ? `${i + 1}.` : '•'}</Text>
              <Text className="text-base text-neutral-700 flex-1 leading-relaxed">
                {renderInline(item)}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'p':
      return (
        <Text key={key} className="text-base text-neutral-700 leading-relaxed">
          {renderInline(block.text)}
        </Text>
      );
  }
}

/** Inline: **tebal**, *miring*, ~~coret~~, [link](https://…) (sama dengan Announcement). */
function renderInline(text: string): React.ReactNode {
  return <Text className="text-neutral-900">{mdInline(text, 'i')}</Text>;
}
