export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatConfidence = (confidence: number): string => {
  return `${confidence.toFixed(2)}%`;
};

export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 90) return 'text-medical-green';
  if (confidence >= 75) return 'text-blue-500';
  if (confidence >= 60) return 'text-yellow-500';
  return 'text-red-500';
};

export const getConfidenceBgColor = (confidence: number): string => {
  if (confidence >= 90) return 'bg-green-50 border-green-200';
  if (confidence >= 75) return 'bg-blue-50 border-blue-200';
  if (confidence >= 60) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
};

export const classNameToReadable = (className: string): string => {
  return className;
};

export const classNameToColor = (className: string): string => {
  const colorMap: { [key: string]: string } = {
    'Adenocarcinoma': '#EF4444',
    'Large Cell Carcinoma': '#3B82F6',
    'Normal / Benign': '#10B981',
    'Squamous Cell Carcinoma': '#A855F7',
  };
  return colorMap[className] || '#6B7280';
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): object => {
  const errors: { [key: string]: string } = {};

  if (password.length < 8) {
    errors.length = 'Password must be at least 8 characters';
  }
  if (!/[a-z]/.test(password)) {
    errors.lowercase = 'Password must contain lowercase letter';
  }
  if (!/[A-Z]/.test(password)) {
    errors.uppercase = 'Password must contain uppercase letter';
  }
  if (!/[0-9]/.test(password)) {
    errors.number = 'Password must contain number';
  }

  return errors;
};

export const getImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const cn = (...classes: (string | undefined | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};
