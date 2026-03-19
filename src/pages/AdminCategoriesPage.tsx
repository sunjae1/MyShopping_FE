import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  toAppErrorMessage,
  updateCategory
} from "../api/client";
import type { Category } from "../api/types";
import { ConfirmModal } from "../components/ConfirmModal";
import { EmptyState } from "../components/EmptyState";
import { StatusBanner } from "../components/StatusBanner";
import { formatNumber, resolveImageUrl } from "../lib/format";

interface CategoryFormState {
  name: string;
}

const emptyForm: CategoryFormState = {
  name: ""
};

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<Category | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const nextCategories = await fetchCategories();

        if (cancelled) {
          return;
        }

        setCategories(nextCategories);
      } catch (error) {
        if (!cancelled) {
          setFeedback(toAppErrorMessage(error, "카테고리 목록을 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const linkedCount = categories.filter((category) => (category.itemCount ?? 0) > 0).length;

    return {
      totalCount: categories.length,
      linkedCount,
      emptyCount: categories.length - linkedCount
    };
  }, [categories]);

  function resetForm() {
    setForm(emptyForm);
    setEditingCategory(null);
  }

  function syncFormFromCategory(category: Category) {
    setEditingCategory(category);
    setForm({
      name: category.name
    });
  }

  async function refreshCategories(nextMessage?: string) {
    const nextCategories = await fetchCategories();
    setCategories(nextCategories);

    if (nextMessage) {
      setFeedback(nextMessage);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = form.name.trim();

    if (!trimmedName) {
      setFeedback("카테고리 이름을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: trimmedName
        });
        await refreshCategories(`카테고리 #${editingCategory.id}를 수정했습니다.`);
      } else {
        await createCategory({
          name: trimmedName
        });
        await refreshCategories("새 카테고리를 만들었습니다.");
      }

      resetForm();
    } catch (error) {
      setFeedback(toAppErrorMessage(error, "카테고리 저장에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    setDeletingCategoryId(category.id);
    setFeedback(null);

    try {
      await deleteCategory(category.id);
      await refreshCategories(`카테고리 #${category.id}를 삭제했습니다.`);

      if (editingCategory?.id === category.id) {
        resetForm();
      }
    } catch (error) {
      setFeedback(toAppErrorMessage(error, "카테고리 삭제에 실패했습니다."));
    } finally {
      setDeletingCategoryId(null);
    }
  }

  return (
    <div className="page-stack">
      <ConfirmModal
        open={pendingDeleteCategory !== null}
        title="카테고리를 삭제할까요?"
        description={
          pendingDeleteCategory
            ? `"${pendingDeleteCategory.name}" 카테고리를 삭제하면 관리 목록에서 바로 사라집니다.`
            : ""
        }
        confirmLabel="카테고리 삭제"
        tone="danger"
        busy={
          pendingDeleteCategory !== null &&
          deletingCategoryId === pendingDeleteCategory.id
        }
        onCancel={() => {
          if (deletingCategoryId !== null) {
            return;
          }
          setPendingDeleteCategory(null);
        }}
        onConfirm={() => {
          if (!pendingDeleteCategory) {
            return;
          }
          void handleDelete(pendingDeleteCategory).finally(() => {
            setPendingDeleteCategory(null);
          });
        }}
      />

      <div className="section-header">
        <div>
          <p className="eyebrow">ADMIN CATEGORY</p>
          <h1>카테고리 관리</h1>
          <p className="section-description">
            `ADMIN` 권한 사용자만 `/api/categories` 생성, 수정, 삭제를 사용할 수 있습니다.
          </p>
        </div>
      </div>

      <StatusBanner tone="info">{feedback}</StatusBanner>

      <section className="admin-summary-grid">
        <article className="surface-card">
          <p className="eyebrow">TOTAL</p>
          <h2>{formatNumber(stats.totalCount)}개</h2>
          <p className="muted-copy">현재 등록된 전체 카테고리 수입니다.</p>
        </article>
        <article className="surface-card">
          <p className="eyebrow">LINKED</p>
          <h2>{formatNumber(stats.linkedCount)}개</h2>
          <p className="muted-copy">대표 이미지가 잡히는, 상품 연결이 있는 카테고리입니다.</p>
        </article>
        <article className="surface-card">
          <p className="eyebrow">EMPTY</p>
          <h2>{formatNumber(stats.emptyCount)}개</h2>
          <p className="muted-copy">아직 상품이 연결되지 않은 카테고리입니다.</p>
        </article>
      </section>

      <section className="admin-page-grid">
        <div className="page-stack">
          <section className="surface-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">CATEGORY LIST</p>
                <h2>관리 대상 카테고리</h2>
              </div>
            </div>

            {loading ? <div className="surface-card">카테고리 목록을 불러오는 중입니다.</div> : null}

            {!loading && categories.length === 0 ? (
              <EmptyState
                eyebrow="EMPTY"
                title="등록된 카테고리가 없습니다."
                description="오른쪽 폼에서 첫 카테고리를 만들어 주세요."
              />
            ) : null}

            <div className="admin-item-list">
              {categories.map((category) => {
                const isEditing = editingCategory?.id === category.id;

                return (
                  <article
                    key={category.id}
                    className={`admin-item-card ${isEditing ? "admin-item-card-active" : ""}`.trim()}
                  >
                    <div className="admin-category-thumb">
                      {category.representativeImageUrl ? (
                        <img
                          src={resolveImageUrl(category.representativeImageUrl)}
                          alt={`${category.name} 대표 이미지`}
                        />
                      ) : (
                        <div className="admin-category-placeholder">
                          아직 해당 카테고리에 상품이 없습니다.
                        </div>
                      )}
                    </div>
                    <div className="admin-item-copy">
                      <div>
                        <p className="eyebrow">CATEGORY #{category.id}</p>
                        <h3>{category.name}</h3>
                      </div>
                      <p className="muted-copy">
                        연결 상품 {formatNumber(category.itemCount ?? 0)}개
                      </p>
                    </div>
                    <div className="admin-item-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => syncFormFromCategory(category)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={deletingCategoryId === category.id}
                        onClick={() => setPendingDeleteCategory(category)}
                      >
                        {deletingCategoryId === category.id ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <section className="surface-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">{editingCategory ? "EDIT CATEGORY" : "NEW CATEGORY"}</p>
              <h2>{editingCategory ? "카테고리 수정" : "카테고리 생성"}</h2>
            </div>
            {editingCategory ? (
              <button type="button" className="ghost-button" onClick={resetForm}>
                새 카테고리 생성으로 전환
              </button>
            ) : null}
          </div>

          {editingCategory ? (
            <div className="admin-preview-card">
              <div className="admin-category-thumb">
                {editingCategory.representativeImageUrl ? (
                  <img
                    src={resolveImageUrl(editingCategory.representativeImageUrl)}
                    alt={`${editingCategory.name} 대표 이미지`}
                  />
                ) : (
                  <div className="admin-category-placeholder">
                    아직 해당 카테고리에 상품이 없습니다.
                  </div>
                )}
              </div>
              <div>
                <strong>{editingCategory.name}</strong>
                <p className="muted-copy">
                  대표 이미지는 카테고리 자체 업로드가 아니라 현재 연결된 상품 이미지에서
                  자동으로 잡힙니다.
                </p>
              </div>
            </div>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              카테고리 이름
              <input
                type="text"
                required
                value={form.name}
                onChange={(event) =>
                  setForm({
                    name: event.target.value
                  })
                }
              />
            </label>

            <p className="field-hint">
              생성 후 상품 관리 화면에서 상품을 연결하면 대표 이미지와 상품 수가 자동으로
              반영됩니다.
            </p>

            <div className="inline-actions">
              <button type="submit" className="primary-button" disabled={saving}>
                {saving
                  ? "저장 중..."
                  : editingCategory
                    ? `카테고리 #${editingCategory.id} 저장`
                    : "카테고리 생성"}
              </button>
              <button type="button" className="ghost-button" onClick={resetForm}>
                입력 초기화
              </button>
            </div>
          </form>
        </section>
      </section>
    </div>
  );
}
