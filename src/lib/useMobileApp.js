import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@shared/lib/supabaseClient';
import { friendlyError } from '@shared/lib/friendlyError';
import {
  applicationFromRow,
  bookingFromRow,
  chatMessageFromRow,
  chatThreadFromRow,
  computeAppMetrics,
  fuelEntryFromRow,
  garageVehicleFromRow,
  partnerGarageFromRow,
  partnerGarageToRow,
  serviceHistoryFromRow,
  serviceItemFromRow,
} from './mobileApp';

/**
 * Everything behind the Mobile App screen, loaded when that screen opens.
 *
 * Deliberately a hook rather than nine more fetches in AdminContext. Nothing
 * else in the portal reads these tables, and the context already fires on every
 * page: putting them there would have every counter terminal pull the whole
 * customer garage on its way to the Orders screen.
 *
 * `error` is a real state, not a swallowed console line. These tables are
 * readable only because of the staff policies added alongside this screen, and
 * if one of those is ever missing the honest answer is "could not read this",
 * not an empty list that reads as "no customers yet".
 */

const TABLES = [
  ['vehicles', 'garage_vehicles', garageVehicleFromRow, { column: 'created_at', ascending: false }],
  ['serviceItems', 'garage_service_items', serviceItemFromRow, { column: 'next_due_km', ascending: true }],
  ['history', 'garage_service_history', serviceHistoryFromRow, { column: 'service_date', ascending: false }],
  ['fuel', 'garage_fuel_entries', fuelEntryFromRow, { column: 'filled_at', ascending: false }],
  ['bookings', 'garage_service_bookings', bookingFromRow, { column: 'created_at', ascending: false }],
  ['garages', 'garage_partner_garages', partnerGarageFromRow, { column: 'name', ascending: true }],
  ['applications', 'garage_partner_applications', applicationFromRow, { column: 'created_at', ascending: false }],
  ['threads', 'chat_threads', chatThreadFromRow, { column: 'last_message_at', ascending: false }],
];

const EMPTY = Object.fromEntries(TABLES.map(([key]) => [key, []]));

export const useMobileApp = () => {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setError('');

    const results = await Promise.all(
      TABLES.map(([, table, , order]) =>
        supabase.from(table).select('*').order(order.column, { ascending: order.ascending })
      )
    );

    const next = {};
    const failed = [];
    results.forEach((result, i) => {
      const [key, table, map] = TABLES[i];
      if (result.error) {
        failed.push(table);
        next[key] = [];
        return;
      }
      next[key] = (result.data ?? []).map(map);
    });

    setData(next);
    setLoading(false);
    if (failed.length > 0) {
      setError(`Could not read ${failed.join(', ')}. The list below is incomplete.`);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const metrics = useMemo(() => computeAppMetrics(data), [data]);

  /* ── Writes ──────────────────────────────────────────────────────────────
     Only the three things the yard is actually responsible for. There is no
     mutation here that touches a customer's car, service history or fuel log:
     staff oversee that data and the RLS policies do not grant a write to it
     either, so a button would only ever have failed. */

  const decideApplication = useCallback(async (id, status) => {
    const { error: err } = await supabase
      .from('garage_partner_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (err) return { ok: false, reason: friendlyError(err, 'Could not update this application.') };
    await refresh();
    return { ok: true };
  }, [refresh]);

  const setBookingStatus = useCallback(async (id, status) => {
    const { error: err } = await supabase
      .from('garage_service_bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (err) return { ok: false, reason: friendlyError(err, 'Could not update this booking.') };
    await refresh();
    return { ok: true };
  }, [refresh]);

  const saveGarage = useCallback(async (garage, { isNew }) => {
    const row = partnerGarageToRow(garage);
    const { error: err } = isNew
      ? await supabase.from('garage_partner_garages').insert({ ...row, created_at: new Date().toISOString() })
      : await supabase.from('garage_partner_garages').update({ ...row, updated_at: new Date().toISOString() }).eq('code', garage.code);
    if (err) return { ok: false, reason: friendlyError(err, 'Could not save this garage.') };
    await refresh();
    return { ok: true };
  }, [refresh]);

  /* Deactivated rather than deleted by default — the code is referenced by
     garage_service_bookings.partner_garage_code, and removing the row would
     leave past bookings pointing at a garage that no longer exists. */
  const setGarageActive = useCallback(async (code, active) => {
    const { error: err } = await supabase
      .from('garage_partner_garages')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('code', code);
    if (err) return { ok: false, reason: friendlyError(err, 'Could not update this garage.') };
    await refresh();
    return { ok: true };
  }, [refresh]);

  const loadMessages = useCallback(async (threadId) => {
    const { data: rows, error: err } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    if (err) return { ok: false, reason: friendlyError(err, 'Could not open this conversation.') };
    return { ok: true, messages: (rows ?? []).map(chatMessageFromRow) };
  }, []);

  /* sender_role is pinned to 'staff' by the RLS check, not by trust in this
     argument — the policy rejects any other value from a staff session. */
  const sendStaffReply = useCallback(async (threadId, body) => {
    const trimmed = String(body ?? '').trim();
    if (!trimmed) return { ok: false, reason: 'Type a message first.' };

    const { data: session } = await supabase.auth.getUser();
    const { error: err } = await supabase.from('chat_messages').insert({
      thread_id: threadId,
      sender_role: 'staff',
      sender_id: session?.user?.id ?? null,
      body: trimmed,
    });
    if (err) return { ok: false, reason: friendlyError(err, 'Could not send that message.') };
    await refresh();
    return { ok: true };
  }, [refresh]);

  const setThreadStatus = useCallback(async (id, status) => {
    const { error: err } = await supabase.from('chat_threads').update({ status }).eq('id', id);
    if (err) return { ok: false, reason: friendlyError(err, 'Could not update this conversation.') };
    await refresh();
    return { ok: true };
  }, [refresh]);

  return {
    ...data,
    metrics,
    loading,
    error,
    refresh,
    decideApplication,
    setBookingStatus,
    saveGarage,
    setGarageActive,
    loadMessages,
    sendStaffReply,
    setThreadStatus,
  };
};
