// Etat du champ ville (nov. 2026) : panneau ferme ou ouvert, texte de la
// case de recherche, option active (clavier). Module pur, partage par le
// composant components/forms/LuLocalityPicker.tsx et ses tests.

export type PickerState = { open: boolean; query: string; active: number };

export type PickerAction =
  | { type: "open"; active?: number }
  | { type: "close" }
  | { type: "query"; query: string }
  | { type: "move"; delta: number; count: number }
  | { type: "set_active"; index: number };

export const initialPicker: PickerState = { open: false, query: "", active: 0 };

export function pickerReducer(state: PickerState, action: PickerAction): PickerState {
  switch (action.type) {
    case "open":
      // Ouverture : case de recherche vide, donc liste complete.
      return { open: true, query: "", active: Math.max(action.active ?? 0, 0) };
    case "close":
      return initialPicker;
    case "query":
      return { ...state, query: action.query, active: 0 };
    case "move":
      if (action.count <= 0) return state;
      return { ...state, active: Math.min(Math.max(state.active + action.delta, 0), action.count - 1) };
    case "set_active":
      return { ...state, active: action.index };
  }
}
