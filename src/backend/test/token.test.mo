import Debug "mo:base/Debug";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Result "mo:base/Result";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Text "mo:base/Text";
import Error "mo:base/Error";

actor TokenTest {
    let token = actor("rrkah-fqaaa-aaaaa-aaaaq-cai") : actor {
        stake : shared (amount: Nat, durationIndex: Nat) -> async Result.Result<(), Text>;
        unstake : shared (stakeIndex: Nat) -> async Result.Result<Nat, Text>;
        getStakes : shared query (user: Principal) -> async [StakeInfo];
        getStakingConfig : shared query () -> async {
            minStake: Nat;
            maxStake: Nat;
            durations: [Int];
            aprRates: [Nat];
        };
        balanceOf : shared query (who: Principal) -> async Nat;
    };

    type StakeInfo = {
        amount: Nat;
        startTime: Int;
        duration: Int;
        claimed: Bool;
    };

    public func testStaking() : async Text {
        try {
            // Test getting staking configuration
            let config = await token.getStakingConfig();
            assert(config.minStake > 0);
            assert(config.maxStake > config.minStake);
            assert(config.durations.size() == config.aprRates.size());

            // Test staking with invalid amount
            let invalidStakeResult = await token.stake(0, 0);
            switch(invalidStakeResult) {
                case (#err(msg)) assert(Text.contains(msg, #text "Invalid stake amount"));
                case (#ok()) assert(false); // Should not succeed
            };

            // Test staking with invalid duration index
            let invalidDurationResult = await token.stake(config.minStake, config.durations.size());
            switch(invalidDurationResult) {
                case (#err(msg)) assert(Text.contains(msg, #text "Invalid duration index"));
                case (#ok()) assert(false); // Should not succeed
            };

            // Test valid staking
            let testAmount = config.minStake;
            let testDuration = 0;
            let stakeResult = await token.stake(testAmount, testDuration);
            switch(stakeResult) {
                case (#err(msg)) {
                    Debug.print("Staking failed: " # msg);
                    assert(false);
                };
                case (#ok()) {};
            };

            // Verify stake was created
            let testPrincipal = Principal.fromActor(TokenTest);
            let stakes = await token.getStakes(testPrincipal);
            assert(stakes.size() > 0);
            let lastStake = stakes[stakes.size() - 1];
            assert(lastStake.amount == testAmount);
            assert(lastStake.duration == config.durations[testDuration]);
            assert(not lastStake.claimed);

            // Test unstaking before duration
            let earlyUnstakeResult = await token.unstake(stakes.size() - 1);
            switch(earlyUnstakeResult) {
                case (#err(msg)) assert(Text.contains(msg, #text "Stake duration not completed"));
                case (#ok(_)) assert(false); // Should not succeed
            };

            // Note: Testing successful unstaking would require waiting for the duration period
            // In a real test environment, we would use time manipulation or separate test cases

            "All staking tests passed!"
        } catch(e) {
            "Test failed: " # Error.message(e)
        }
    };

    public func testStakingRewards() : async Text {
        try {
            let config = await token.getStakingConfig();
            let testAmount = config.minStake;
            let testDuration = 0;

            // Get initial balance
            let testPrincipal = Principal.fromActor(TokenTest);
            let initialBalance = await token.balanceOf(testPrincipal);

            // Stake tokens
            let stakeResult = await token.stake(testAmount, testDuration);
            switch(stakeResult) {
                case (#err(msg)) {
                    Debug.print("Staking failed: " # msg);
                    assert(false);
                };
                case (#ok()) {};
            };

            // Verify balance was reduced
            let balanceAfterStake = await token.balanceOf(testPrincipal);
            assert(balanceAfterStake == initialBalance - testAmount);

            // Note: Testing reward calculation would require time manipulation
            // In a real test environment, we would use time controls to verify rewards

            "All staking reward tests passed!"
        } catch(e) {
            "Test failed: " # Error.message(e)
        }
    };
}; 