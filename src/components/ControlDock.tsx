import { ASPECTS, SHAPES, type AspectId, type ShapeId } from "../lib/constants";
import { FlipIcon, MotionIcon } from "./Icons";

interface ControlDockProps {
  aspect: AspectId;
  shape: ShapeId;
  adaptive: boolean;
  mirrored: boolean;
  onAspectChange: (aspect: AspectId) => void;
  onShapeChange: (shape: ShapeId) => void;
  onAdaptiveChange: (value: boolean) => void;
  onMirrorChange: (value: boolean) => void;
}

export function ControlDock({
  aspect,
  shape,
  adaptive,
  mirrored,
  onAspectChange,
  onShapeChange,
  onAdaptiveChange,
  onMirrorChange
}: ControlDockProps) {
  return (
    <div className="control-dock" aria-label="Kamera-Widget Einstellungen">
      <div className="shape-row" role="group" aria-label="Form">
        {SHAPES.map((option) => (
          <button
            key={option.id}
            className="shape-button"
            data-active={shape === option.id}
            onClick={() => onShapeChange(option.id)}
            title={option.label}
            aria-label={option.label}
            aria-pressed={shape === option.id}
          >
            <span className={`shape-swatch shape-${option.id}`} />
          </button>
        ))}
      </div>

      <div className="dock-rule" />

      <div className="ratio-row" role="group" aria-label="Seitenverhältnis">
        {ASPECTS.map((option) => (
          <button
            key={option.id}
            data-active={aspect === option.id}
            onClick={() => onAspectChange(option.id)}
            aria-pressed={aspect === option.id}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="dock-rule" />

      <button
        className="icon-toggle"
        data-active={adaptive}
        onClick={() => onAdaptiveChange(!adaptive)}
        title="Motiv folgen"
        aria-label="Motiv folgen"
        aria-pressed={adaptive}
      >
        <MotionIcon />
      </button>
      <button
        className="icon-toggle"
        data-active={mirrored}
        onClick={() => onMirrorChange(!mirrored)}
        title="Bild spiegeln"
        aria-label="Bild spiegeln"
        aria-pressed={mirrored}
      >
        <FlipIcon />
      </button>
    </div>
  );
}
