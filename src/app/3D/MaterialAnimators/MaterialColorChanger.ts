import { ProductConfiguratorService } from "../../product-configurator.service";
import { MaterialAnimationType } from "./MaterialAnimationType";
import { MaterialColorSwapEventData } from "../models/EventData/MaterialColorSwapEventData";
import { Color, Material, Mesh } from "three";
import { ColorMaterial } from "../3rd-party/three/ColorMaterial";
import { isColorMaterial } from "../utility/MaterialUtility";
import { createAnimation } from "./CreateAnimation";
import { ActiveProductItemEventType } from "../models/ProductItem/ActiveProductItemEventType";

interface AnimatableColorItem {
  startColor: Color;
  deltaColor: Color;
  material: ColorMaterial;
}

export class MaterialColorChanger {
  private productConfiguratorService: ProductConfiguratorService;

  constructor(productConfiguratorService: ProductConfiguratorService) {
    this.productConfiguratorService = productConfiguratorService;

    productConfiguratorService.material_ColorSwap.subscribe(event => {
      switch (event.animationType) {
        case MaterialAnimationType.None:
          this.changeColorLinearly(event, 0);
          break;
        case MaterialAnimationType.Linear:
          this.changeColorLinearly(event, 250);
          break;
      }
    });
  }

  changeColorLinearly(event: MaterialColorSwapEventData, duration: number): void {
    const items = this.getAnimatableItems(event);
    const doProgress = (progress: number): void => {
      for (const item of items) {
        const r = item.startColor.r + progress * item.deltaColor.r;
        const g = item.startColor.g + progress * item.deltaColor.g;
        const b = item.startColor.b + progress * item.deltaColor.b;

        item.material.color.setRGB(r, g, b);
      }
    };

    // If duration is 0 just instantly set the colour.
    if (duration <= 0) {
      doProgress(1);
      return;
    }

    const animate = createAnimation(event.productItem, ActiveProductItemEventType.ColorChange, duration, doProgress);
    requestAnimationFrame(animate);
  }

  private getAnimatableItems(event: MaterialColorSwapEventData): AnimatableColorItem[] {
    const items: AnimatableColorItem[] = [];
    if (event.materials) {
      this.tryAddAnimatableItems(event.materials, items, event.targetColor);
    }

    if (event.rootObject) {
      event.rootObject.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) {
          return;
        }

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        this.tryAddAnimatableItems(materials, items, event.targetColor);
      });
    }

    return items;
  }

  private tryAddAnimatableItems(materials: Material[], items: AnimatableColorItem[], targetColor: Color): void {
    for (const material of materials) {
      if (!isColorMaterial(material)) {
        continue;
      }

      const deltaColor = new Color(targetColor.r - material.color.r, targetColor.g - material.color.g, targetColor.b - material.color.b);

      items.push({
        material,
        startColor: material.color.clone(),
        deltaColor,
      });
    }
  }
}
