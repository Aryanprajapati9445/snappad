import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { IContentMetadata } from '../models/Content';

const isValidPublicUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const hostname = u.hostname.toLowerCase();
    const privatePatterns = [
      /^localhost$/,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];
    return !privatePatterns.some((p) => p.test(hostname));
  } catch {
    return false;
  }
};

export const extractMetadata = async (url: string): Promise<IContentMetadata> => {
  const metadata: IContentMetadata = {
    domain: new URL(url).hostname.replace('www.', ''),
  };

  try {
    if (!isValidPublicUrl(url)) return metadata;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeVaultBot/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 8000,
    } as any);

    if (!response.ok) return metadata;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Title
    metadata.title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text().trim() ||
      undefined;

    // Description
    metadata.description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      undefined;

    // Image
    metadata.image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      undefined;

    // Favicon
    const faviconHref =
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href');

    if (faviconHref) {
      try {
        metadata.favicon = new URL(faviconHref, url).href;
      } catch {
        metadata.favicon = `https://${metadata.domain}/favicon.ico`;
      }
    } else {
      metadata.favicon = `https://${metadata.domain}/favicon.ico`;
    }

    // Truncate long strings
    if (metadata.title && metadata.title.length > 200) {
      metadata.title = metadata.title.substring(0, 200);
    }
    if (metadata.description && metadata.description.length > 500) {
      metadata.description = metadata.description.substring(0, 500);
    }
  } catch (error) {
    console.error(`Metadata extraction failed for ${url}:`, error);
  }

  return metadata;
};
