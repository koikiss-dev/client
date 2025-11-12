import React from "react";
import { api } from "./api.js";

export function useCrud(resource) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const list = React.useCallback(async (params = {}) => {
    setLoading(true); setError(null);
    try {
      const r = await api.get(`/${resource}`, { params });
      setItems(Array.isArray(r.data) ? r.data : r.data.items || []);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  }, [resource]);

  const create = async (data) => (await api.post(`/${resource}`, data)).data;
  const update = async (id, data) => (await api.patch(`/${resource}/${id}`, data)).data;
  const remove = async (id) => (await api.delete(`/${resource}/${id}`)).data;

  return { items, loading, error, list, create, update, remove, setItems };
}
