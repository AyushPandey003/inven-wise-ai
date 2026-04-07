import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("InventoryProvenanceModule", (m) => {
  const inventoryProvenance = m.contract("InventoryProvenance");

  return { inventoryProvenance };
});
