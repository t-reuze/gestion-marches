import { useMarcheMeta } from '../context/MarcheMetaContext';

export default function WorkflowStepToggle({ marcheId, stepKey }) {
  const { getMeta, setMeta } = useMarcheMeta();
  const steps = getMeta(marcheId).workflowSteps || {};
  const done = !!steps[stepKey];

  function toggle() {
    setMeta(marcheId, { workflowSteps: { ...steps, [stepKey]: !done } });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={'btn btn-sm ' + (done ? 'btn-outline' : 'btn-primary')}
      style={{
        fontSize: 12, whiteSpace: 'nowrap',
        ...(done ? { color: '#15803D', borderColor: '#86EFAC', background: '#F0FDF4' } : {}),
      }}
      title={done ? 'Cliquer pour marquer comme non terminée' : 'Marquer cette étape comme terminée'}
    >
      {done ? '✓ Étape terminée — rouvrir' : '✓ Terminer cette étape'}
    </button>
  );
}
