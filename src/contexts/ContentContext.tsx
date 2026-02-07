import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { defaultContent, SiteContent } from "@/config/siteContent";

interface ContentContextType {
  content: SiteContent;
  updateContent: (key: string, value: string) => void;
  isEditMode: boolean;
  toggleEditMode: () => void;
  resetContent: () => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

const STORAGE_KEY = "megapost_content";

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<SiteContent>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultContent, ...JSON.parse(saved) };
      }
    } catch {}
    return { ...defaultContent };
  });

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    try {
      const diff: SiteContent = {};
      for (const key in content) {
        if (content[key] !== defaultContent[key]) {
          diff[key] = content[key];
        }
      }
      if (Object.keys(diff).length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(diff));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, [content]);

  const updateContent = useCallback((key: string, value: string) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
  }, []);

  const resetContent = useCallback(() => {
    setContent({ ...defaultContent });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ContentContext.Provider value={{ content, updateContent, isEditMode, toggleEditMode, resetContent }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent must be used within ContentProvider");
  return ctx;
};
