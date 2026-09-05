import React from "react";
import { Linking, StyleProp, TextStyle } from "react-native";
import { Text } from "@/components/Text";

/**
 * Matches either a markdown link — `[label](https://…)` — or a bare URL, so the
 * lesson YAML can write links in whichever of the two styles it prefers.
 */
const LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"')\]]+)/g;

/** Punctuation that ends a sentence rather than the URL it follows. */
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

function open(url: string) {
  Linking.openURL(url).catch(() => {
    // A device with no browser for the scheme: nothing useful to do.
  });
}

/**
 * Splits `text` into plain segments plus tappable links. Returns a plain string
 * when there is nothing to linkify, so the common case stays allocation-free.
 */
export function renderTextWithLinks(
  text: string,
  linkStyle: StyleProp<TextStyle>
): React.ReactNode {
  LINK_PATTERN.lastIndex = 0;
  if (!LINK_PATTERN.test(text)) return text;

  LINK_PATTERN.lastIndex = 0;
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = LINK_PATTERN.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));

    const [raw, mdLabel, mdUrl, bareUrl] = match;
    if (mdUrl) {
      nodes.push(
        <Text key={match.index} style={linkStyle} onPress={() => open(mdUrl)}>
          {mdLabel}
        </Text>
      );
    } else {
      const trailing = TRAILING_PUNCTUATION.exec(bareUrl)?.[0] ?? "";
      const url = trailing ? bareUrl.slice(0, -trailing.length) : bareUrl;
      nodes.push(
        <Text key={match.index} style={linkStyle} onPress={() => open(url)}>
          {url}
        </Text>
      );
      if (trailing) nodes.push(trailing);
    }

    cursor = match.index + raw.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
