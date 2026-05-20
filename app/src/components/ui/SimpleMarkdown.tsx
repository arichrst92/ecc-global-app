import { Text, View } from 'react-native';

type Props = {
  source: string;
};

/**
 * Minimal markdown renderer untuk renungan/news content.
 * Support: H1-H3 headings, paragraphs, bold (**), italic (*), bullets (-),
 * blockquotes (>), Bible verse style (italic indented).
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
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let currentList: string[] | null = null;
  let currentParagraph: string[] = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      blocks.push({ type: 'p', text: currentParagraph.join(' ').trim() });
      currentParagraph = [];
    }
  }
  function flushList() {
    if (currentList && currentList.length > 0) {
      blocks.push({ type: 'list', items: currentList });
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

    // List item
    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushParagraph();
      if (!currentList) currentList = [];
      currentList.push(line.slice(2));
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
              <Text className="text-base text-neutral-700">•</Text>
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

/** Render inline marks: **bold**, *italic*. Returns array of React nodes. */
function renderInline(text: string): React.ReactNode {
  // Split on bold first, then italic per token
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  return boldParts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} className="font-bold text-neutral-900">
          {renderItalic(part.slice(2, -2))}
        </Text>
      );
    }
    return <Text key={i}>{renderItalic(part)}</Text>;
  });
}

function renderItalic(text: string): React.ReactNode {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <Text key={i} className="italic">
          {part.slice(1, -1)}
        </Text>
      );
    }
    return part;
  });
}
