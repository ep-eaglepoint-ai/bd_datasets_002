"""Multi-Signature Transaction Demo"""

from repository_after import (
    KeyPair,
    MultiSigWallet,
    sign_payload,
    SignatureCoordinator,
    SignatureError,
    ThresholdNotMetError,
    PartialSignature,
)


def main():
    print("=" * 60)
    print("Multi-Signature Transaction Demo")
    print("=" * 60)
    
    # Generate 3 key pairs (simulating different devices/co-signers)
    print("\n1. Generating 3 key pairs...")
    key_pairs = [KeyPair() for _ in range(3)]
    for i, kp in enumerate(key_pairs):
        print(f"   Signer {i + 1}: {kp.public_key_hex[:16]}...")
    
    # Create multi-sig wallet
    print("\n2. Creating multi-sig wallet (2-of-3 threshold)...")
    public_keys = [kp.public_key for kp in key_pairs]
    wallet = MultiSigWallet(public_keys, threshold=2)
    print(f"   {wallet}")
    print(f"   Addresses: {[addr[:16] + '...' for addr in wallet.addresses]}")
    
    # Create unsigned transaction
    print("\n3. Creating unsigned transaction payload...")
    recipient = "a" * 40
    amount = 100000
    fee = wallet.estimate_fee()
    
    payload = wallet.create_transaction_payload(
        recipient=recipient,
        amount=amount
    )
    print(f"   Recipient: {recipient[:16]}...")
    print(f"   Amount: {amount}")
    print(f"   Fee: {fee}")
    print(f"   Nonce: {payload.transaction.nonce}")
    print(f"   Payload hash: {payload.hash_hex()[:16]}...")
    
    # Create coordinator
    print("\n4. Creating signature coordinator...")
    coordinator = wallet.create_coordinator(payload)
    print(f"   Threshold: {payload.threshold}")
    print(f"   Authorized signers: 3")
    
    # Demo: Try to get signed transaction before threshold is met
    print("\n5. Error handling: Attempting to get signed tx before threshold met...")
    try:
        coordinator.get_signed_transaction()
    except ThresholdNotMetError as e:
        print(f"   ✗ Expected error: {e.message}")
    
    # Demo: Try to add invalid signature (unauthorized key)
    print("\n6. Error handling: Attempting to add signature from unauthorized key...")
    unauthorized_key = KeyPair()
    try:
        fake_sig = sign_payload(unauthorized_key, payload, signer_index=0)
        coordinator.add_signature(fake_sig)
    except SignatureError as e:
        print(f"   ✗ Expected error: {e.message}")
    
    # Demo: Try to add invalid signature bytes
    print("\n7. Error handling: Attempting to add invalid signature bytes...")
    try:
        invalid_sig = PartialSignature(
            public_key_bytes=key_pairs[0].public_key_bytes,
            signature=b"invalid_signature_bytes",
            signer_index=0
        )
        coordinator.add_signature(invalid_sig)
    except SignatureError as e:
        print(f"   ✗ Expected error: {e.message}")
    
    # Collect valid signatures (2 of 3)
    print("\n8. Collecting valid partial signatures (2 of 3)...")
    
    sig1 = sign_payload(key_pairs[0], payload, signer_index=0)
    coordinator.add_signature(sig1)
    print(f"   ✓ Signature from signer 1 added and verified")
    print(f"   Signatures collected: {coordinator.get_signature_count()}")
    
    sig2 = sign_payload(key_pairs[1], payload, signer_index=1)
    coordinator.add_signature(sig2)
    print(f"   ✓ Signature from signer 2 added and verified")
    print(f"   Signatures collected: {coordinator.get_signature_count()}")
    
    # Check threshold
    print(f"\n9. Checking threshold...")
    if coordinator.is_threshold_met():
        print(f"   ✓ Threshold met! ({coordinator.get_signature_count()}/{payload.threshold})")
    else:
        print(f"   ✗ Threshold not met (need {coordinator.get_missing_signer_count()} more)")
    
    # Get signed transaction
    print("\n10. Getting fully signed transaction...")
    signed_tx = coordinator.get_signed_transaction()
    print(f"    Transaction hash: {signed_tx.payload_hash[:16]}...")
    print(f"    Signature count: {len(signed_tx.signatures)}")
    
    # Broadcast
    print("\n11. Broadcasting transaction...")
    result = wallet.broadcast(signed_tx)
    
    if result['success']:
        print(f"    ✓ Transaction broadcast successful!")
        print(f"    Transaction hash: {result['transaction_hash'][:16]}...")
    else:
        print(f"    ✗ Broadcast failed")
    
    print("\n" + "=" * 60)
    print("Demo complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
