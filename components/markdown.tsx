import Link from 'next/link';
import React, { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Page, Text, View, Document, StyleSheet, renderToBuffer, PDFDownloadLink, renderToStream, renderToFile  } from '@react-pdf/renderer';

const components: Partial<Components> = {
  pre: ({ children }) => (
    <Text>
      {children}
    </Text>
  ),
  ol: ({ node, children, ...props }) => (
    <Text style={{ marginLeft: 20 }}>
      {children}
    </Text>
  ),
  li: ({ node, children, ...props }) => (
    <Text style={{ marginVertical: 5 }}>
      {children}
    </Text>
  ),
  ul: ({ node, children, ...props }) => (
    <Text style={{ marginLeft: 20 }}>
      {children}
    </Text>
  ),
  strong: ({ node, children, ...props }) => (
    <Text style={{ fontWeight: 'bold' }}>
      {children}
    </Text>
  ),
  a: ({ node, children, ...props }) => (
    <Text style={{ color: 'blue', textDecoration: 'underline' }}>
      {children}
    </Text>
  ),
  h1: ({ node, children, ...props }) => (
    <Text style={{ fontSize: 24, fontWeight: 'bold', marginVertical: 10 }}>
      {children}
    </Text>
  ),
  h2: ({ node, children, ...props }) => (
    <Text style={{ fontSize: 20, fontWeight: 'bold', marginVertical: 8 }}>
      {children}
    </Text>
  ),
  h3: ({ node, children, ...props }) => (
    <Text style={{ fontSize: 18, fontWeight: 'bold', marginVertical: 6 }}>
      {children}
    </Text>
  ),
  h4: ({ node, children, ...props }) => (
    <Text style={{ fontSize: 16, fontWeight: 'bold', marginVertical: 5 }}>
      {children}
    </Text>
  ),
  h5: ({ node, children, ...props }) => (
    <Text style={{ fontSize: 14, fontWeight: 'bold', marginVertical: 4 }}>
      {children}
    </Text>
  ),
  h6: ({ node, children, ...props }) => (
    <Text style={{ fontSize: 12, fontWeight: 'bold', marginVertical: 3 }}>
      {children}
    </Text>
  ),
};

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);