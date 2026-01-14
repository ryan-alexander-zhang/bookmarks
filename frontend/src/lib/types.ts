export interface Tag {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Bookmark {
  id: string;
  url: string;
  normalizedUrl: string;
  title: string;
  description: string;
  categoryId?: string | null;
  categoryName?: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface BookmarkListResponse {
  items: Bookmark[];
  pagination: Pagination;
}

export interface Rule {
  id: string;
  name: string;
  hostPrefix: string;
  urlPrefix: string;
  pathPrefix: string;
  titleContains: string;
  categoryId?: string | null;
  categoryName?: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}
