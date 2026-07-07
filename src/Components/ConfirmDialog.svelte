<!-- / - Arinara Network © 2026 - / -->
<!-- This source code is the exclusive property of Arinara Network. -->
<!-- Unauthorized use, reproduction, distribution, or modification of this -->
<!-- code — in whole or in part — for any purpose whatsoever is strictly -->
<!-- prohibited without prior written consent from Arinara Network as the -->
<!-- sole legal owner of this codebase. -->
<script lang="ts">
  export let title: string;
  export let message: string;
  export let confirmLabel = 'Confirm';
  export let onConfirm: () => void;
  export let onCancel: () => void;
</script>

<div class="modal-backdrop" role="presentation">
  <div class="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
    <h2 id="confirm-title">{title}</h2>
    <p>{message}</p>
    <footer>
      <button type="button" class="secondary" on:click={onCancel}>Cancel</button>
      <button type="button" class="danger" on:click={onConfirm}>{confirmLabel}</button>
    </footer>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.62);
    backdrop-filter: blur(12px);
  }

  .dialog-panel {
    width: min(360px, calc(100vw - 32px));
    border: 1px solid #252a32;
    border-radius: 10px;
    background: #0d0f12;
    color: #ffffff;
    padding: 18px;
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55);
  }

  h2 {
    margin: 0;
    font-size: 18px;
    letter-spacing: 0;
  }

  p {
    margin: 8px 0 18px;
    color: #a1a1aa;
    font-size: 13px;
    line-height: 1.45;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  button {
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 800;
    padding: 9px 14px;
  }

  .secondary {
    border: 1px solid #252a32;
    background: #111317;
    color: #d4d4d8;
  }

  .danger {
    background: #ffffff;
    color: #050608;
  }
</style>
