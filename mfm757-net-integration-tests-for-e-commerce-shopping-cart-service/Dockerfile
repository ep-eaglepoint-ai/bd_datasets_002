FROM mcr.microsoft.com/dotnet/sdk:7.0

WORKDIR /app

# Copy all files
COPY . /app

# Create tests_before directory for before repository tests
RUN mkdir -p /app/tests_before && \
    cp /app/tests/*.cs /app/tests_before/ 2>/dev/null || true && \
    cp /app/tests/*.csproj /app/tests_before/ 2>/dev/null || true

# Update tests_before to reference before repository
RUN if [ -f /app/tests_before/EcommerceCart.Tests.csproj ]; then \
    sed -i 's|repository_after|repository_before|g' /app/tests_before/EcommerceCart.Tests.csproj; \
    fi

# Restore and build repository_before
WORKDIR /app/repository_before
RUN dotnet restore || true
RUN dotnet build --no-restore || true

# Restore and build repository_after
WORKDIR /app/repository_after
RUN dotnet restore || true
RUN dotnet build --no-restore || true

# Restore and build tests
WORKDIR /app/tests
RUN dotnet restore || true
RUN dotnet build --no-restore || true

# Restore and build tests_before
WORKDIR /app/tests_before
RUN dotnet restore || true
RUN dotnet build --no-restore || true

# Restore and build evaluation
WORKDIR /app/evaluation
RUN dotnet restore || true
RUN dotnet build --no-restore || true

# Create reports directory
RUN mkdir -p /app/evaluation/reports

WORKDIR /app