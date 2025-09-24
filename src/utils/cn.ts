// src/utils/cn.ts

type ClassValue = string | boolean | undefined | null | Record<string, boolean>;

// Function to join the class names based on truthy values
export const cn = (...classes: ClassValue[]) => {
  return classes
    .map((cls) => {
      if (typeof cls === 'string') return cls;
      if (typeof cls === 'object' && cls !== null) {
        return Object.entries(cls)
          .filter(([, value]) => value)
          .map(([key]) => key)
          .join(' ');
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
};
