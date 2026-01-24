package ratelimiter

import (
	"context"

	pb "github.com/example/ratelimiter/proto"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/durationpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type GRPCServer struct {
	pb.UnimplementedRateLimiterServiceServer
	limiter *RateLimiter
}

func NewGRPCServer(limiter *RateLimiter) *GRPCServer {
	return &GRPCServer{limiter: limiter}
}

func (s *GRPCServer) CheckRateLimit(ctx context.Context, req *pb.RateLimitRequest) (*pb.RateLimitResponse, error) {
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key is required")
	}

	n := req.Tokens
	if n == 0 {
		n = 1
	}

	result, err := s.limiter.AllowN(ctx, req.Key, n)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &pb.RateLimitResponse{
		Allowed:    result.Allowed,
		Remaining:  result.Remaining,
		RetryAfter: durationpb.New(result.RetryAfter),
		ResetAt:    timestamppb.New(result.ResetAt),
	}, nil
}

func (s *GRPCServer) ResetRateLimit(ctx context.Context, req *pb.ResetRequest) (*pb.ResetResponse, error) {
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key is required")
	}

	err := s.limiter.Reset(ctx, req.Key)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &pb.ResetResponse{Success: true}, nil
}

func (s *GRPCServer) GetStatus(ctx context.Context, req *pb.StatusRequest) (*pb.RateLimitResponse, error) {
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key is required")
	}

	result, err := s.limiter.GetStatus(ctx, req.Key)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &pb.RateLimitResponse{
		Allowed:   result.Allowed,
		Remaining: result.Remaining,
		ResetAt:   timestamppb.New(result.ResetAt),
	}, nil
}

