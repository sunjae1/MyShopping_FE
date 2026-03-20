import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  createItem,
  deleteItem,
  fetchCategories,
  fetchItems,
  toAppErrorMessage,
  updateItem
} from "../api/client";
import type { Category, Item, ItemMutationInput } from "../api/types";
import { ConfirmModal } from "../components/ConfirmModal";
import { EmptyState } from "../components/EmptyState";
import { StatusBanner } from "../components/StatusBanner";
import { formatCurrency, formatNumber, resolveImageUrl } from "../lib/format";

interface ItemFormState {
  itemName: string;
  price: string;
  quantity: string;
  categoryId: string;
  imageFile: File | null;
}

const emptyForm: ItemFormState = {
  itemName: "",
  price: "",
  quantity: "",
  categoryId: "",
  imageFile: null
};

export function AdminItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [form, setForm] = useState<ItemFormState>(emptyForm);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<Item | null>(null);

  const activeCategoryId =
    selectedCategoryId === "all" ? null : Number(selectedCategoryId);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const [nextCategories, nextItems] = await Promise.all([
          fetchCategories().catch(() => []),
          fetchItems({
            keyword,
            categoryId: activeCategoryId
          })
        ]);

        if (cancelled) {
          return;
        }

        setCategories(nextCategories);
        setItems(nextItems);
      } catch (error) {
        if (!cancelled) {
          setFeedback(toAppErrorMessage(error, "관리용 상품 목록을 불러오지 못했습니다."));
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
  }, [keyword, activeCategoryId]);

  const stats = useMemo(() => {
    const inStockCount = items.filter((item) => item.quantity > 0).length;

    return {
      visibleCount: items.length,
      inStockCount,
      categoryCount: categories.length
    };
  }, [categories.length, items]);

  function resetForm() {
    setForm(emptyForm);
    setEditingItem(null);
  }

  function syncFormFromItem(item: Item) {
    setEditingItem(item);
    setForm({
      itemName: item.itemName,
      price: String(item.price),
      quantity: String(item.quantity),
      categoryId: item.categoryId ? String(item.categoryId) : "",
      imageFile: null
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    setForm((current) => ({
      ...current,
      imageFile: nextFile
    }));
  }

  async function refreshData(nextMessage?: string) {
    const [nextCategories, nextItems] = await Promise.all([
      fetchCategories().catch(() => []),
      fetchItems({
        keyword,
        categoryId: activeCategoryId
      })
    ]);

    setCategories(nextCategories);
    setItems(nextItems);

    if (nextMessage) {
      setFeedback(nextMessage);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const categoryId = Number(form.categoryId);
    const price = Number(form.price);
    const quantity = Number(form.quantity);

    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      setFeedback("카테고리를 선택해 주세요.");
      return;
    }

    if (!editingItem && !form.imageFile) {
      setFeedback("새 상품 등록 시 이미지를 선택해 주세요.");
      return;
    }

    const payload: ItemMutationInput = {
      itemName: form.itemName.trim(),
      price,
      quantity,
      categoryId,
      imageFile: form.imageFile
    };

    setSaving(true);
    setFeedback(null);

    try {
      if (editingItem) {
        await updateItem(editingItem.id, payload);
        await refreshData(`상품 #${editingItem.id}를 수정했습니다.`);
      } else {
        await createItem(payload);
        await refreshData("새 상품을 등록했습니다.");
      }

      resetForm();
    } catch (error) {
      setFeedback(toAppErrorMessage(error, "상품 저장에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Item) {
    setDeletingItemId(item.id);
    setFeedback(null);

    try {
      await deleteItem(item.id);
      await refreshData(`상품 #${item.id}를 삭제했습니다.`);

      if (editingItem?.id === item.id) {
        resetForm();
      }
    } catch (error) {
      setFeedback(toAppErrorMessage(error, "상품 삭제에 실패했습니다."));
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <div className="page-stack">
      <ConfirmModal
        open={pendingDeleteItem !== null}
        title="상품을 삭제할까요?"
        description={
          pendingDeleteItem
            ? `"${pendingDeleteItem.itemName}" 상품을 삭제하면 목록에서 바로 사라집니다.`
            : ""
        }
        confirmLabel="상품 삭제"
        tone="danger"
        busy={pendingDeleteItem !== null && deletingItemId === pendingDeleteItem.id}
        onCancel={() => {
          if (deletingItemId !== null) {
            return;
          }
          setPendingDeleteItem(null);
        }}
        onConfirm={() => {
          if (!pendingDeleteItem) {
            return;
          }
          void handleDelete(pendingDeleteItem).finally(() => {
            setPendingDeleteItem(null);
          });
        }}
      />

      <div className="section-header">
        <div>
          <p className="eyebrow">ADMIN MERCH</p>
          <h1>상품 관리</h1>
          <p className="section-description">
            스토어에 노출될 상품을 등록하고 판매 상태를 한곳에서 관리해 보세요.
          </p>
        </div>
      </div>

      <StatusBanner tone="info">{feedback}</StatusBanner>

      <section className="admin-summary-grid">
        <article className="surface-card">
          <p className="eyebrow">VISIBLE ITEMS</p>
          <h2>{formatNumber(stats.visibleCount)}개</h2>
          <p className="muted-copy">현재 목록에서 확인 중인 상품 수입니다.</p>
        </article>
        <article className="surface-card">
          <p className="eyebrow">IN STOCK</p>
          <h2>{formatNumber(stats.inStockCount)}개</h2>
          <p className="muted-copy">지금 바로 판매할 수 있는 상품입니다.</p>
        </article>
        <article className="surface-card">
          <p className="eyebrow">CATEGORIES</p>
          <h2>{formatNumber(stats.categoryCount)}개</h2>
          <p className="muted-copy">운영 중인 카테고리 수를 보여줍니다.</p>
        </article>
      </section>

      <section className="admin-page-grid">
        <div className="page-stack">
          <section className="surface-card">
            <div className="section-header admin-form-section-header">
              <div>
                <p className="eyebrow">FILTER</p>
                <h2>판매 상품 찾기</h2>
              </div>
            </div>

            <div className="catalog-summary admin-filter-summary">
              현재 {formatNumber(items.length)}개 상품 노출
            </div>

            <div className="admin-toolbar">
              <label className="search-shell">
                <span>카테고리</span>
                <select
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                >
                  <option value="all">전체 카테고리</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="search-shell">
                <span>상품명 검색</span>
                <input
                  type="search"
                  placeholder="예: Alpha Coat"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="surface-card">
            <div className="section-header admin-list-section-header">
              <div>
                <p className="eyebrow">ITEMS</p>
                <h2>관리 대상 상품</h2>
              </div>
            </div>

            {loading ? <div className="surface-card">상품 목록을 가져오는 중입니다.</div> : null}

            {!loading && items.length === 0 ? (
              <EmptyState
                eyebrow="EMPTY"
                title="조건에 맞는 상품이 없습니다."
                description="검색 조건을 바꾸거나 새 상품을 등록해 보세요."
              />
            ) : null}

            <div className="admin-item-list">
              {items.map((item) => {
                const isEditing = editingItem?.id === item.id;

                return (
                  <article
                    key={item.id}
                    className={`admin-item-card ${isEditing ? "admin-item-card-active" : ""}`.trim()}
                  >
                    <img src={resolveImageUrl(item.imageUrl)} alt={item.itemName} />
                    <div className="admin-item-copy">
                      <div>
                        <p className="eyebrow">
                          {item.categoryName ?? "미분류"} · #{item.id}
                        </p>
                        <h3>{item.itemName}</h3>
                      </div>
                      <p className="muted-copy">
                        {formatCurrency(item.price)} · 재고 {formatNumber(item.quantity)}개
                      </p>
                    </div>
                    <div className="admin-item-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => syncFormFromItem(item)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={deletingItemId === item.id}
                        onClick={() => setPendingDeleteItem(item)}
                      >
                        {deletingItemId === item.id ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <section className="surface-card">
          <div className="section-header admin-form-section-header">
            <div>
              <p className="eyebrow">{editingItem ? "EDIT ITEM" : "NEW ITEM"}</p>
              <h2>{editingItem ? "상품 수정" : "상품 등록"}</h2>
            </div>
            {editingItem ? (
              <button type="button" className="ghost-button" onClick={resetForm}>
                새 상품 등록으로 전환
              </button>
            ) : null}
          </div>

          {editingItem?.imageUrl ? (
            <div className="admin-preview-card">
              <img src={resolveImageUrl(editingItem.imageUrl)} alt={editingItem.itemName} />
              <div>
                <strong>현재 대표 이미지</strong>
                <p className="muted-copy">새 파일을 선택하면 이 이미지로 교체됩니다.</p>
              </div>
            </div>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              상품명
              <input
                type="text"
                required
                value={form.itemName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    itemName: event.target.value
                  }))
                }
              />
            </label>

            <div className="admin-form-grid">
              <label>
                가격
                <input
                  type="number"
                  min={10}
                  required
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      price: event.target.value
                    }))
                  }
                />
              </label>

              <label>
                재고
                <input
                  type="number"
                  min={0}
                  required
                  value={form.quantity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      quantity: event.target.value
                    }))
                  }
                />
              </label>
            </div>

            <label>
              카테고리
              <select
                required
                value={form.categoryId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    categoryId: event.target.value
                  }))
                }
              >
                <option value="">카테고리 선택</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              이미지 파일
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </label>

            <p className="field-hint">
              새 상품은 대표 이미지가 필요하며, 수정 시에는 새 파일을 올릴 때만 이미지가
              바뀝니다.
            </p>

            <div className="inline-actions">
              <button type="submit" className="primary-button" disabled={saving}>
                {saving
                  ? "저장 중..."
                  : editingItem
                    ? `상품 #${editingItem.id} 저장`
                    : "상품 등록"}
              </button>
              <button type="button" className="ghost-button" onClick={resetForm}>
                다시 입력
              </button>
            </div>
          </form>
        </section>
      </section>
    </div>
  );
}
