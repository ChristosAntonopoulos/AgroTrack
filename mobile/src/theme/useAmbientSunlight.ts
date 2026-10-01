import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { LightSensor } from 'expo-sensors';
import { resolveSunnyFromLux, SUN_SAMPLE_MS } from './ambientSunlight';

export type AmbientSunlightState = {
  /** True when the device exposes a light sensor we can read. */
  available: boolean;
  /** True while lux is in the sunny band (with hysteresis). */
  isSunny: boolean;
};

/**
 * Probes Android light-sensor availability, and samples lux when `listen` is true.
 * iOS and sensor-less devices report available: false.
 */
export function useAmbientSunlight(listen: boolean): AmbientSunlightState {
  const [available, setAvailable] = useState(false);
  const [isSunny, setIsSunny] = useState(false);

  // One-shot availability check (Android only).
  useEffect(() => {
    let cancelled = false;
    if (Platform.OS !== 'android') {
      setAvailable(false);
      return;
    }
    (async () => {
      try {
        const hasSensor = await LightSensor.isAvailableAsync();
        if (!cancelled) setAvailable(hasSensor);
      } catch {
        if (!cancelled) setAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sample lux only while Bright field auto should drive the palette.
  useEffect(() => {
    if (!listen || !available) {
      setIsSunny(false);
      return;
    }

    let cancelled = false;
    LightSensor.setUpdateInterval(SUN_SAMPLE_MS);
    const subscription = LightSensor.addListener(({ illuminance }) => {
      if (cancelled || typeof illuminance !== 'number' || Number.isNaN(illuminance)) {
        return;
      }
      setIsSunny((prev) => resolveSunnyFromLux(illuminance, prev));
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [listen, available]);

  return { available, isSunny };
}
