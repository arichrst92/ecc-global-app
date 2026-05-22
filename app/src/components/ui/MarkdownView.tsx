/**
 * Minimal markdown renderer untuk legal pages — no external dep.
 * Subset support:
 * - `# h1`, `## h2`, `### h3` headings
 * - `- item` bullet lists (single level)
 * - `1. item` numbered lists
 * - `**bold**` inline
 * - `[text](url)` inline links
 * - blank line = paragraph break
 * - everything else = paragraph
 *
 * Untuk full markdown (tables, code blocks, etc) di future, swap dengan
 * `react-native-markdown-display` (~50KB) — pattern fetch + render-as-string
 * tetap sama, cuma ganti komponen.
 */
import { Fragment } from 'react';
import { Linking, Text, View } from 'react-native';

type Block =
  | { type: 'h1' | 'h2' | 'h3' | 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] };

function parseBlocks(md: string): Block[] {
  const lines = md.split('\n');
  const blocks: Block[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let currentPara: string[] = [];

  function flushPara() {
    if (currentPara.length > 0) {
      blocks.push({ type: 'p', text: currentPara.join(' ').trim() });
      currentPara = [];
    }
  }
  function flushList() {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '') {
      flushPara();
      flushList();
      continue;
    }

    if (line.startsWith('### ')) {
      flushPara();
      flushList();
      blocks.push({ type: 'h3', text: line.slice(4) });
      continue;
    }
    if (line.startsWith('## ')) {
      flushPara();
      flushList();
      blocks.push({ type: 'h2', text: line.slice(3) });
      continue;
    }
    if (line.startsWith('# ')) {
      flushPara();
      flushList();
      blocks.push({ type: 'h1', text: line.slice(2) });
      continue;
    }

    // bullet list "- item" atau "* item"
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }

    // numbered list "1. item"
    if (/^\d+\.\s+/.test(line)) {
      flushPara();
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(line.replace(/^\d+\.\s+/, ''));
      continue;
    }

    // paragraph line
    flushList();
    currentPara.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

/**
 * Inline parse — bold + link. Return array dari elements untuk render.
 */
function renderInline(text: string): React.ReactNode[] {
  // Regex match [text](url) atau **bold**
  const pattern = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      result.push(
        <Text key={key++} className="font-bold">
          {token.slice(2, -2)}
        </Text>,
      );
    } else {
      // [text](url)
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (m) {
        const [, label, url] = m;
        result.push(
          <Text
            key={key++}
            className="text-brand-600 underline"
            onPress={() => Linking.openURL(url).catch(() => {})}
          >
            {label}
          </Text>,
        );
      } else {
        result.push(token);
      }
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }
  return result;
}

export function MarkdownView({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return (
    <View>
      {blocks.map((block, idx) => {
        if (block.type === 'h1') {
          return (
            <Text
              key={idx}
              className="text-xl font-bold text-neutral-900 mt-4 mb-2"
            >
              {renderInline(block.text)}
            </Text>
          );
        }
        if (block.type === 'h2') {
          return (
            <Text
              key={idx}
              className="text-base font-bold text-neutral-900 mt-4 mb-2"
            >
              {renderInline(block.text)}
            </Text>
          );
        }
        if (block.type === 'h3') {
          return (
            <Text
              key={idx}
              className="text-sm font-bold text-neutral-900 mt-3 mb-1"
            >
              {renderInline(block.text)}
            </Text>
          );
        }
        if (block.type === 'ul' || block.type === 'ol') {
          return (
            <View key={idx} className="mb-3 gap-1">
              {block.items.map((item, i) => (
                <View key={i} className="flex-row gap-2 pl-1">
                  <Text className="text-sm text-neutral-700">
                    {block.type === 'ul' ? '•' : `${i + 1}.`}
                  </Text>
                  <Text className="text-sm text-neutral-700 flex-1 leading-relaxed">
                    {renderInline(item)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        if (block.type === 'p') {
          return (
            <Text
              key={idx}
              className="text-sm text-neutral-700 leading-relaxed mb-3"
            >
              {renderInline(block.text)}
            </Text>
          );
        }
        return null;
      })}
    </View>
  );
}
