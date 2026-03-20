export const POST_TITLE_MAX_LENGTH = 80;
export const POST_CONTENT_MAX_LENGTH = 2000;

type PostDraftLike = {
  title: string;
  content: string;
};

type PostLengthErrors = {
  title: string | null;
  content: string | null;
};

export function getRemainingCharacterCount(value: string, maxLength: number) {
  return maxLength - value.length;
}

export function getLengthHintText(label: string, value: string, maxLength: number) {
  const remaining = getRemainingCharacterCount(value, maxLength);

  if (remaining >= 0) {
    return `${remaining}자 남음`;
  }

  return `${label}은 ${maxLength}자 이하로 입력해 주세요. ${Math.abs(remaining)}자 초과했습니다.`;
}

export function getLengthError(label: string, value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return null;
  }

  return `${label}은 ${maxLength}자 이하로 입력해 주세요.`;
}

export function validatePostDraftLength(draft: PostDraftLike): PostLengthErrors {
  return {
    title: getLengthError("제목", draft.title, POST_TITLE_MAX_LENGTH),
    content: getLengthError("내용", draft.content, POST_CONTENT_MAX_LENGTH)
  };
}
