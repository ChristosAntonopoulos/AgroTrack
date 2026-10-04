import { useEffect, useState } from 'react';
import type { Field } from '../../services/fieldService';
import { guessHarvestField, type FieldLocationGuess } from '../fieldGuess';

/** Returns a GPS field recommendation; sheets may auto-apply when confident. */
export function useHarvestFieldGuess(fields: Field[]): {
  recommendation: FieldLocationGuess | null;
  loading: boolean;
} {
  const [recommendation, setRecommendation] = useState<FieldLocationGuess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void guessHarvestField(fields).then((guess) => {
      if (cancelled) return;
      setRecommendation(guess);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fields]);

  return { recommendation, loading };
}
