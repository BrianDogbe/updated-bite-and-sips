import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useApp } from '../../../shared/store/AppStore';
import type { MenuItem } from '../../../shared/types';
import { GHS, cn, uid } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Card, CardBody, Badge, Input, Empty, SectionTitle } from '../../../components/ui/primitives';
import { useToast } from '../../../components/ui/toaster';

export default function MenuManager() {
  const { menu, setAvailability, upsertMenuItem, logAudit, user } = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCat, setNewCat] = useState('burgers');

  const filtered = menu.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()));
  const actor = user?.name ?? 'admin';

  const saveEdit = () => {
    if (!editing) return;
    const price = Number(draftPrice);
    if (!draftName.trim() || Number.isNaN(price) || price < 0) {
      toast({ title: 'Invalid values', body: 'Name and a non-negative price are required.', kind: 'error' });
      return;
    }
    const prev = `${editing.name} @ ${editing.price}`;
    const next = { ...editing, name: draftName.trim(), price };
    upsertMenuItem(next);
    logAudit(actor, `Edited menu item ${editing.id}`, 'menu', prev, `${next.name} @ ${next.price}`);
    toast({ title: 'Menu item updated', kind: 'success' });
    setEditing(null);
  };

  const addItem = () => {
    const price = Number(newPrice);
    if (!newName.trim() || Number.isNaN(price) || price < 0) {
      toast({ title: 'Invalid values', body: 'Name and a non-negative price are required.', kind: 'error' });
      return;
    }
    const item: MenuItem = {
      id: uid('m'), name: newName.trim(), description: '', price,
      categoryId: newCat, image: '', available: true,
      ingredients: [], allergens: [], modifiers: [], prepMinutes: 10,
    };
    upsertMenuItem(item);
    logAudit(actor, `Created menu item ${item.id}`, 'menu', undefined, `${item.name} @ ${item.price}`);
    toast({ title: 'Menu item added', kind: 'success' });
    setNewName(''); setNewPrice('');
  };

  return (
    <div className="space-y-4">
      <SectionTitle kicker="Catalogue" title="Menu manager" sub={`${menu.filter((m) => m.available).length} of ${menu.length} items available`} />
      <Card>
        <CardBody className="flex flex-col gap-2 p-4 md:flex-row md:items-center">
          <div className="flex-1"><Input placeholder="Search menu…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search menu" /></div>
          <div className="flex gap-2">
            <Input placeholder="New item name" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="New item name" />
            <Input placeholder="Price" inputMode="decimal" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} aria-label="New item price" className="w-28" />
            <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className="h-11 rounded-xl border border-coal/15 bg-white px-2 text-sm" aria-label="Category">
              {['burgers', 'rice', 'pizza', 'pasta', 'breakfast', 'chicken', 'sides', 'snacks', 'desserts', 'drinks', 'sips', 'popular'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Button onClick={addItem}><Plus /> Add</Button>
          </div>
        </CardBody>
      </Card>

      {filtered.length === 0 ? (
        <Empty title="No menu items" body="Try a different search." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-coal/10 text-xs uppercase tracking-wide text-coal/50">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-coal/5">
                    <td className="px-4 py-3 font-semibold">{m.name}</td>
                    <td className="px-4 py-3 text-coal/60">{m.categoryId}</td>
                    <td className="px-4 py-3 text-right font-bold">{GHS(m.price)}</td>
                    <td className="px-4 py-3">
                      <button
                        role="switch"
                        aria-checked={m.available}
                        aria-label={`Toggle ${m.name}`}
                        onClick={() => {
                          setAvailability(m.id, !m.available);
                          logAudit(actor, `Set ${m.id} available=${!m.available}`, 'menu', String(m.available), String(!m.available));
                        }}
                        className={cn('relative h-6 w-11 rounded-full transition-colors', m.available ? 'bg-leaf' : 'bg-coal/20')}
                      >
                        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', m.available ? 'left-[22px]' : 'left-0.5')} />
                      </button>{' '}
                      <Badge className={m.available ? 'bg-leaf/10 text-leaf' : 'bg-coal/5 text-coal/60'}>
                        {m.available ? 'Available' : 'Hidden'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => { setEditing(m); setDraftName(m.name); setDraftPrice(String(m.price)); }}
                      >
                        <Pencil /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-label="Edit menu item">
          <div className="absolute inset-0 bg-coal/40" onClick={() => setEditing(null)} />
          <Card className="relative w-full max-w-sm">
            <CardBody className="space-y-2">
              <h3 className="font-display text-lg font-extrabold">Edit {editing.name}</h3>
              <label className="text-xs font-bold uppercase tracking-wide text-coal/50" htmlFor="edit-name">Name</label>
              <Input id="edit-name" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
              <label className="text-xs font-bold uppercase tracking-wide text-coal/50" htmlFor="edit-price">Price (GHS)</label>
              <Input id="edit-price" inputMode="decimal" value={draftPrice} onChange={(e) => setDraftPrice(e.target.value)} />
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
                <Button className="flex-1" onClick={saveEdit}>Save</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
