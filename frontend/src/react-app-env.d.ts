/// <reference types="react-scripts" />

declare module 'html2canvas-pro' {
  function html2canvas(
    element: HTMLElement,
    options?: Record<string, unknown>
  ): Promise<HTMLCanvasElement>;
  export default html2canvas;
}

