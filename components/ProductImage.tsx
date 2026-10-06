// Product imagery, mirroring the web `components/ProductImage.tsx` resolution
// order: (1) the product's own image_url, (2) the generated Wikimedia manifest
// via `@/lib/product-images`, (3) a gradient tile in the product's accent —
// so the storefront looks complete with zero assets and no extra network hops.

import { LinearGradient } from "expo-linear-gradient";
import {
  Image,
  StyleSheet,
  Text,
  type ImageStyle,
  type StyleProp,
} from "react-native";

import { localImageFor } from "@/lib/product-images";
import type { Product } from "@/lib/types";
import { absoluteUrl } from "~/lib/env";

interface ProductImageProps {
  product: Product;
  style?: StyleProp<ImageStyle>;
}

/** Human-friendly label without the leading brand word (same as web). */
function shortName(title: string, brand: string): string {
  return title.startsWith(brand) ? title.slice(brand.length).trim() : title;
}

export function ProductImage({ product, style }: ProductImageProps) {
  const src = absoluteUrl(product.image_url || localImageFor(product.slug));

  if (src) {
    return <Image source={{ uri: src }} style={[styles.image, style]} resizeMode="cover" />;
  }

  return (
    <LinearGradient
      colors={[product.accent, "#162445"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.image, styles.placeholder, style]}
    >
      <Text style={styles.placeholderBrand}>{product.brand.toUpperCase()}</Text>
      <Text style={styles.placeholderTitle} numberOfLines={2}>
        {shortName(product.title, product.brand)}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  image: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  placeholderBrand: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  placeholderTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
});
