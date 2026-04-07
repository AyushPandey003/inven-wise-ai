import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("InventoryProvenance", function () {
  async function deployContract() {
    const [owner, actor1, actor2, unauthorized] = await ethers.getSigners();
    const contract = await ethers.deployContract("InventoryProvenance");
    return { contract, owner, actor1, actor2, unauthorized };
  }

  // ─── Deployment ───────────────────────────────────────
  describe("Deployment", function () {
    it("Should set the deployer as owner", async function () {
      const { contract, owner } = await deployContract();
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Should authorize the owner as an actor", async function () {
      const { contract, owner } = await deployContract();
      expect(await contract.authorizedActors(owner.address)).to.be.true;
    });

    it("Should start with 0 total events", async function () {
      const { contract } = await deployContract();
      expect(await contract.totalEvents()).to.equal(0n);
    });
  });

  // ─── Access Control ───────────────────────────────────
  describe("Access Control", function () {
    it("Should allow owner to authorize an actor", async function () {
      const { contract, actor1 } = await deployContract();
      await expect(contract.authorizeActor(actor1.address))
        .to.emit(contract, "ActorAuthorized")
        .withArgs(actor1.address);
      expect(await contract.authorizedActors(actor1.address)).to.be.true;
    });

    it("Should allow owner to revoke an actor", async function () {
      const { contract, actor1 } = await deployContract();
      await contract.authorizeActor(actor1.address);
      await expect(contract.revokeActor(actor1.address))
        .to.emit(contract, "ActorRevoked")
        .withArgs(actor1.address);
      expect(await contract.authorizedActors(actor1.address)).to.be.false;
    });

    it("Should not allow non-owner to authorize actors", async function () {
      const { contract, actor1, actor2 } = await deployContract();
      await expect(
        contract.connect(actor1).authorizeActor(actor2.address)
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("Should allow ownership transfer", async function () {
      const { contract, owner, actor1 } = await deployContract();
      await expect(contract.transferOwnership(actor1.address))
        .to.emit(contract, "OwnershipTransferred")
        .withArgs(owner.address, actor1.address);
      expect(await contract.owner()).to.equal(actor1.address);
    });

    it("Should reject zero address for authorization", async function () {
      const { contract } = await deployContract();
      await expect(
        contract.authorizeActor(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(contract, "ZeroAddress");
    });

    it("Should reject zero address for ownership transfer", async function () {
      const { contract } = await deployContract();
      await expect(
        contract.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(contract, "ZeroAddress");
    });
  });

  // ─── Recording Events ─────────────────────────────────
  describe("Recording Events", function () {
    it("Should record a provenance event as owner", async function () {
      const { contract, owner } = await deployContract();

      await expect(
        contract.recordEvent("SKU-001", 0, "Factory A", "ipfs://metadata1")
      )
        .to.emit(contract, "EventRecorded")
        .withArgs(0n, "SKU-001", 0, () => true, owner.address);

      expect(await contract.totalEvents()).to.equal(1n);
    });

    it("Should record event as authorized actor", async function () {
      const { contract, actor1 } = await deployContract();
      await contract.authorizeActor(actor1.address);

      await expect(
        contract
          .connect(actor1)
          .recordEvent("SKU-001", 2, "Warehouse B", "ipfs://metadata2")
      ).to.emit(contract, "EventRecorded");
    });

    it("Should reject recording from unauthorized address", async function () {
      const { contract, unauthorized } = await deployContract();
      await expect(
        contract
          .connect(unauthorized)
          .recordEvent("SKU-001", 0, "Factory A", "ipfs://metadata1")
      ).to.be.revertedWithCustomError(contract, "Unauthorized");
    });

    it("Should reject empty product ID", async function () {
      const { contract } = await deployContract();
      await expect(
        contract.recordEvent("", 0, "Factory A", "ipfs://metadata1")
      ).to.be.revertedWithCustomError(contract, "EmptyProductId");
    });

    it("Should chain events correctly with previous hash", async function () {
      const { contract } = await deployContract();

      // First event - previousHash should be 0x0
      await contract.recordEvent("SKU-001", 0, "Factory A", "ipfs://meta1");
      const event0 = await contract.getFunction("getEvent")(0);
      expect(event0.previousHash).to.equal(ethers.ZeroHash);

      // Second event - previousHash should be first event's hash
      await contract.recordEvent("SKU-001", 2, "Port B", "ipfs://meta2");
      const event1 = await contract.getFunction("getEvent")(1);
      expect(event1.previousHash).to.equal(event0.eventHash);
    });
  });

  // ─── Query Functions ──────────────────────────────────
  describe("Query Functions", function () {
    it("Should return correct chain length", async function () {
      const { contract } = await deployContract();
      await contract.recordEvent("SKU-001", 0, "Factory", "ipfs://m1");
      await contract.recordEvent("SKU-001", 2, "Port", "ipfs://m2");
      await contract.recordEvent("SKU-001", 3, "Warehouse", "ipfs://m3");

      expect(await contract.getChainLength("SKU-001")).to.equal(3n);
      expect(await contract.getChainLength("SKU-999")).to.equal(0n);
    });

    it("Should return product chain indices", async function () {
      const { contract } = await deployContract();
      await contract.recordEvent("SKU-001", 0, "Factory", "ipfs://m1");
      await contract.recordEvent("SKU-002", 0, "Factory", "ipfs://m2");
      await contract.recordEvent("SKU-001", 2, "Port", "ipfs://m3");

      const chain = await contract.getProductChain("SKU-001");
      expect(chain).to.deep.equal([0n, 2n]);
    });

    it("Should return paginated events", async function () {
      const { contract } = await deployContract();
      for (let i = 0; i < 5; i++) {
        await contract.recordEvent("SKU-001", 0, `Loc-${i}`, `ipfs://m${i}`);
      }

      const events = await contract.getProductEvents("SKU-001", 1, 2);
      expect(events.length).to.equal(2);
      expect(events[0].location).to.equal("Loc-1");
      expect(events[1].location).to.equal("Loc-2");
    });

    it("Should handle out-of-range pagination gracefully", async function () {
      const { contract } = await deployContract();
      await contract.recordEvent("SKU-001", 0, "Factory", "ipfs://m1");

      const events = await contract.getProductEvents("SKU-001", 10, 5);
      expect(events.length).to.equal(0);
    });
  });

  // ─── Chain Verification ───────────────────────────────
  describe("Chain Verification", function () {
    it("Should verify a valid chain", async function () {
      const { contract } = await deployContract();
      await contract.recordEvent("SKU-001", 0, "Factory", "ipfs://m1");
      await contract.recordEvent("SKU-001", 1, "QA Lab", "ipfs://m2");
      await contract.recordEvent("SKU-001", 2, "Port", "ipfs://m3");

      const [valid, length] = await contract.verifyChain("SKU-001");
      expect(valid).to.be.true;
      expect(length).to.equal(3n);
    });

    it("Should verify an empty chain as valid", async function () {
      const { contract } = await deployContract();
      const [valid, length] = await contract.verifyChain("NONEXISTENT");
      expect(valid).to.be.true;
      expect(length).to.equal(0n);
    });

    it("Should verify individual event integrity", async function () {
      const { contract } = await deployContract();
      await contract.recordEvent("SKU-001", 0, "Factory", "ipfs://m1");
      const event0 = await contract.getFunction("getEvent")(0);
      expect(event0.productId).to.equal("SKU-001");
      expect(event0.location).to.equal("Factory");
      expect(event0.metadataURI).to.equal("ipfs://m1");
    });
  });

  // ─── Full Workflow ────────────────────────────────────
  describe("Full Supply Chain Workflow", function () {
    it("Should track a product through entire supply chain", async function () {
      const { contract, owner, actor1, actor2 } = await deployContract();

      // Authorize supply chain actors
      await contract.authorizeActor(actor1.address); // Inspector
      await contract.authorizeActor(actor2.address); // Retailer

      const productId = "PROD-2024-001";

      // 1. Manufactured (owner = manufacturer)
      await contract.recordEvent(productId, 0, "Shanghai Factory", "ipfs://manufactured");

      // 2. Inspected (actor1 = inspector)
      await contract.connect(actor1).recordEvent(productId, 1, "QA Lab Shanghai", "ipfs://inspected");

      // 3. Shipped
      await contract.recordEvent(productId, 2, "Shanghai Port", "ipfs://shipped");

      // 4. Received (actor2 = retailer)
      await contract.connect(actor2).recordEvent(productId, 3, "LA Port", "ipfs://received");

      // 5. Stored
      await contract.connect(actor2).recordEvent(productId, 4, "LA Warehouse", "ipfs://stored");

      // 6. Sold
      await contract.connect(actor2).recordEvent(productId, 5, "Retail Store #42", "ipfs://sold");

      // Verify the full chain
      const [valid, length] = await contract.verifyChain(productId);
      expect(valid).to.be.true;
      expect(length).to.equal(6n);

      // Verify chain head matches last event
      const chainHead = await contract.chainHead(productId);
      const lastEvent = await contract.getFunction("getEvent")(5);
      expect(chainHead).to.equal(lastEvent.eventHash);

      // Verify total events
      expect(await contract.totalEvents()).to.equal(6n);
    });
  });
});
