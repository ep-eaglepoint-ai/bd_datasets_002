from collections import defaultdict

def longestSpecialPath(edges: list[list[int]], nums: list[int]) -> list[int]:
    n = len(nums)
    if n == 0:
        return [0, 0]
    if n == 1:
        return [0, 1]

    adj = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))
        adj[v].append((u, w))

    result = [-1, 0] 

    path_dists = []
    val_positions = defaultdict(list)

    stack = [(0, -1, 0, 0, 0, -1, 0)]

    while stack:
        u, p, depth, current_dist, start_index, duplicate_start_depth, state = (
            stack.pop()
        )

        if state == 0:
            path_dists.append(current_dist)
            val = nums[u]

            previous_depths = val_positions[val]
            last_seen_depth = previous_depths[-1] if previous_depths else -1

            new_start = start_index
            new_duplicate_start = duplicate_start_depth

            if last_seen_depth >= start_index:
                if duplicate_start_depth != -1:
                    break_point = min(duplicate_start_depth, last_seen_depth)
                    new_start = break_point + 1
                    new_duplicate_start = max(duplicate_start_depth, last_seen_depth)
                else:
                    new_duplicate_start = last_seen_depth

            curr_len = path_dists[depth] - path_dists[new_start]
            curr_nodes = depth - new_start + 1

            if curr_len > result[0]:
                result = [curr_len, curr_nodes]
            elif curr_len == result[0]:
                if curr_nodes < result[1]:
                    result[1] = curr_nodes

            val_positions[val].append(depth)

            stack.append((u, p, depth, current_dist, new_start, new_duplicate_start, 1))

            for v, w in reversed(adj[u]):
                if v != p:
                    stack.append(
                        (
                            v,
                            u,
                            depth + 1,
                            current_dist + w,
                            new_start,
                            new_duplicate_start,
                            0,
                        )
                    )
        else:
            val = nums[u]
            val_positions[val].pop()
            path_dists.pop()

    return result
