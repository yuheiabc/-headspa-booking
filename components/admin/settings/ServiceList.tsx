'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Toggle from '@/components/ui/Toggle';
import Modal from '@/components/ui/Modal';
import ServiceForm from './ServiceForm';
import toast from 'react-hot-toast';
import type { Service } from '@/types';

interface ServiceListProps {
  services: Service[];
  onRefresh: () => void;
}

export default function ServiceList({ services, onRefresh }: ServiceListProps) {
  const [items, setItems] = useState(services);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const reordered = Array.from(items);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setItems(reordered);

    try {
      const orders = reordered.map((s, i) => ({ id: s.id, sort_order: i + 1 }));
      const res = await fetch('/api/settings/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
        cache: 'no-store',
      });
      if (!res.ok) {
        let errorMsg = '並び順の更新に失敗しました';
        try { const err = await res.json(); errorMsg = err.error || errorMsg; } catch { /* empty */ }
        throw new Error(errorMsg);
      }
      toast.success('並び順を更新しました');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '並び順の更新に失敗しました');
      onRefresh();
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      const res = await fetch(`/api/settings/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !service.is_active }),
        cache: 'no-store',
      });
      if (!res.ok) {
        let errorMsg = '更新に失敗しました';
        try { const err = await res.json(); errorMsg = err.error || errorMsg; } catch { /* empty */ }
        throw new Error(errorMsg);
      }
      setItems((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, is_active: !s.is_active } : s))
      );
      toast.success(service.is_active ? '非公開にしました' : '公開しました');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新に失敗しました');
    }
  };

  const handleAdd = async (data: Partial<Service>) => {
    try {
      const res = await fetch('/api/settings/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        cache: 'no-store',
      });
      if (!res.ok) {
        let errorMsg = '追加に失敗しました';
        try { const err = await res.json(); errorMsg = err.error || errorMsg; } catch { /* empty */ }
        throw new Error(errorMsg);
      }
      toast.success('メニューを追加しました');
      setShowAddModal(false);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '追加に失敗しました');
    }
  };

  const handleEdit = async (data: Partial<Service>) => {
    if (!editingService) return;
    try {
      const res = await fetch(`/api/settings/services/${editingService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        cache: 'no-store',
      });
      if (!res.ok) {
        let errorMsg = '更新に失敗しました';
        try { const err = await res.json(); errorMsg = err.error || errorMsg; } catch { /* empty */ }
        throw new Error(errorMsg);
      }
      toast.success('メニューを更新しました');
      setEditingService(null);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/settings/services/${deleteTarget.id}`, {
        method: 'DELETE',
        cache: 'no-store',
      });
      if (!res.ok) {
        let errorMsg = '削除に失敗しました';
        try { const err = await res.json(); errorMsg = err.error || errorMsg; } catch { /* empty */ }
        throw new Error(errorMsg);
      }
      toast.success('メニューを削除しました');
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  return (
    <>
      <div className="mb-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#C9A96E] text-white rounded-lg font-medium hover:bg-[#A07840] transition-colors text-sm"
        >
          + 新しいメニューを追加
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="services">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {items.map((service, index) => (
                <Draggable key={service.id} draggableId={service.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4 transition-shadow ${
                        snapshot.isDragging ? 'shadow-lg' : ''
                      }`}
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="text-gray-400 cursor-grab active:cursor-grabbing"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{service.name}</div>
                        <div className="text-xs text-gray-500">{service.description}</div>
                      </div>

                      <div className="text-sm text-gray-600 whitespace-nowrap">{service.duration}分</div>
                      <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
                        ¥{service.price.toLocaleString()}
                      </div>

                      <Toggle
                        checked={service.is_active}
                        onChange={() => handleToggleActive(service)}
                      />

                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingService(service)}
                          className="px-2.5 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => setDeleteTarget(service)}
                          className="px-2.5 py-1.5 text-xs bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="メニューを追加">
        <ServiceForm onSave={handleAdd} onCancel={() => setShowAddModal(false)} />
      </Modal>

      <Modal
        isOpen={!!editingService}
        onClose={() => setEditingService(null)}
        title="メニューを編集"
      >
        <ServiceForm
          service={editingService}
          onSave={handleEdit}
          onCancel={() => setEditingService(null)}
        />
      </Modal>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="メニューの削除"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            「{deleteTarget?.name}」を削除しますか？
          </p>
          <p className="text-sm text-gray-500">
            この操作は取り消せません。既存の予約データには影響しません。
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              削除する
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
