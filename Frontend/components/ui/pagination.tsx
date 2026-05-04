"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onViewAll?: () => void;
}

export function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange, onViewAll }: PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between  py-4 border-t border-gray-200 w-full bg-gray-100">
      {/* Left side: Items range + View all */}
      <div className="flex items-center text-sm text-gray-500">
        {startItem} to {endItem} items of {totalItems}
        {onViewAll && (
          <button
            className="ml-2 text-emerald-500 hover:underline"
            onClick={onViewAll}
          >
            View all
          </button>
        )}
      </div>

      {/* Right side: Pagination buttons */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 p-0 border-gray-200"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
          const pageNumber = i + 1;
          return (
            <Button
              key={pageNumber}
              variant={currentPage === pageNumber ? "default" : "outline"}
              size="sm"
              className={`h-8 w-8 p-0 ${
                currentPage === pageNumber ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "border-gray-200"
              }`}
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </Button>
          );
        })}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 p-0 border-gray-200"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
